!macro customInstall
  ; 允许用户选择安装目录
  !define MUI_DIRECTORYPAGE
  !insertmacro MUI_PAGE_DIRECTORY
!macroend

!macro customUnInstall
  ; 自定义卸载逻辑
!macroend