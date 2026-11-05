; Uninstalling Capnote removes "Edit with Capnote" from the right-click menu of text files. The
; installed app adds it itself (src/main/files.js), per user, for these extensions.
!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.md\shell\CapnoteEdit"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\CapnoteEdit"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.txt\shell\CapnoteEdit"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.html\shell\CapnoteEdit"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.htm\shell\CapnoteEdit"
!macroend
