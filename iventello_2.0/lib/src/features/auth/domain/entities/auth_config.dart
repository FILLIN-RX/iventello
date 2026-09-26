enum DeliveryChannel {
  email,
  sms,
  localSimulated,
}

class AuthConfig {
  final DeliveryChannel defaultChannel;
  final String senderEmail;
  final String senderName;
  final String? smtpHost;
  final int smtpPort;
  final String? smtpUsername;
  final String? smtpPassword;
  final bool smtpUseTls;
  final String? smsApiUrl;
  final String? smsApiKey;
  final String? smsSenderId;
  final int otpLength;
  final int otpValidityMinutes;
  final int resendCooldownSeconds;
  final int maxVerificationAttempts;

  const AuthConfig({
    this.defaultChannel = DeliveryChannel.localSimulated,
    this.senderEmail = 'noreply@iventello.com',
    this.senderName = 'Iventello POS & Stock',
    this.smtpHost,
    this.smtpPort = 587,
    this.smtpUsername,
    this.smtpPassword,
    this.smtpUseTls = true,
    this.smsApiUrl,
    this.smsApiKey,
    this.smsSenderId = 'IVENTELLO',
    this.otpLength = 6,
    this.otpValidityMinutes = 10,
    this.resendCooldownSeconds = 60,
    this.maxVerificationAttempts = 5,
  });

  Map<String, dynamic> toJson() => {
        'defaultChannel': defaultChannel.name,
        'senderEmail': senderEmail,
        'senderName': senderName,
        'smtpHost': smtpHost,
        'smtpPort': smtpPort,
        'smtpUsername': smtpUsername,
        'smtpPassword': smtpPassword,
        'smtpUseTls': smtpUseTls,
        'smsApiUrl': smsApiUrl,
        'smsApiKey': smsApiKey,
        'smsSenderId': smsSenderId,
        'otpLength': otpLength,
        'otpValidityMinutes': otpValidityMinutes,
        'resendCooldownSeconds': resendCooldownSeconds,
        'maxVerificationAttempts': maxVerificationAttempts,
      };

  factory AuthConfig.fromJson(Map<String, dynamic> json) => AuthConfig(
        defaultChannel: DeliveryChannel.values.firstWhere(
          (e) => e.name == json['defaultChannel'],
          orElse: () => DeliveryChannel.localSimulated,
        ),
        senderEmail: json['senderEmail'] ?? 'noreply@iventello.com',
        senderName: json['senderName'] ?? 'Iventello POS & Stock',
        smtpHost: json['smtpHost'],
        smtpPort: json['smtpPort'] ?? 587,
        smtpUsername: json['smtpUsername'],
        smtpPassword: json['smtpPassword'],
        smtpUseTls: json['smtpUseTls'] ?? true,
        smsApiUrl: json['smsApiUrl'],
        smsApiKey: json['smsApiKey'],
        smsSenderId: json['smsSenderId'] ?? 'IVENTELLO',
        otpLength: json['otpLength'] ?? 6,
        otpValidityMinutes: json['otpValidityMinutes'] ?? 10,
        resendCooldownSeconds: json['resendCooldownSeconds'] ?? 60,
        maxVerificationAttempts: json['maxVerificationAttempts'] ?? 5,
      );
}
