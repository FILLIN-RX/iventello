!macro customUnInit
  MessageBox MB_YESNO|MB_ICONQUESTION "Supprimer également toutes les données de l'application (base de données, configuration, session) ?$\n$\nRecommandé si vous ne comptez plus utiliser Iventello." IDYES true IDNO false
  true:
    SetShellVarContext current
    RMDir /r "$APPDATA\Iventello"
    Goto done
  false:
    Goto done
  done:
!macroend

!macro customRemoveFiles
  SetShellVarContext current
  Delete "$DESKTOP\Iventello.lnk"
  Delete "$SMPROGRAMS\Iventello\*.*"
  RMDir "$SMPROGRAMS\Iventello"
!macroend