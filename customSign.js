const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(configuration) {
  const certPath = path.resolve(__dirname, 'build', 'cert.pfx');
  const certPassword = process.env.CSC_KEY_PASSWORD || 'Iventello2024!';
  const filePath = path.resolve(configuration.path);

  // 1. Cherche signtool.exe si le SDK Windows est présent
  const signtoolPaths = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
  ];

  let signtool = signtoolPaths.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (signtool) {
    try {
      execSync(
        `"${signtool}" sign /fd SHA256 /f "${certPath}" /p "${certPassword}" /tr http://timestamp.digicert.com /td SHA256 "${filePath}"`,
        { stdio: 'inherit' }
      );
      console.log('✅ Signé avec signtool : ' + filePath);
      return;
    } catch (e) {
      console.warn('⚠️ Échec signtool, repli sur PowerShell :', e.message);
    }
  }

  // 2. Repli universel : PowerShell Set-AuthenticodeSignature (natif Windows, aucun SDK requis)
  try {
    const escapedCertPath = certPath.replace(/'/g, "''");
    const escapedCertPassword = certPassword.replace(/'/g, "''");
    const escapedFilePath = filePath.replace(/'/g, "''");

    const psCommand = [
      `$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${escapedCertPath}', '${escapedCertPassword}')`,
      `Set-AuthenticodeSignature -FilePath '${escapedFilePath}' -Certificate $cert -TimestampServer 'http://timestamp.digicert.com' -HashAlgorithm SHA256`
    ].join('; ');

    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, {
      stdio: 'inherit'
    });
    console.log('✅ Signé avec PowerShell Authenticode : ' + filePath);
  } catch (err) {
    console.error('❌ Erreur de signature pour : ' + filePath, err.message);
  }
};

