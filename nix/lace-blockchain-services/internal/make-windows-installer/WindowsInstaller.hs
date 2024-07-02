{-# LANGUAGE RecordWildCards, LambdaCase #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE NamedFieldPuns    #-}

module Main
    ( main
    , writeInstallerNSIS
    , writeUninstallerNSIS
    ) where

import           Universum hiding (pass, writeFile, stdout, FilePath, die, view)

import qualified Data.List
import qualified Data.Text as T
import           Development.NSIS (Attrib (IconFile, IconIndex, RebootOK, Recursive, Required, StartOptions, Target),
                                   HKEY (HKLM), Level (Highest), Page (Directory, InstFiles), abort,
                                   constant, constantStr, createDirectory, createShortcut, delete,
                                   deleteRegKey, file, iff_, installDir, installDirRegKey,
                                   name, nsis, onPagePre, onError, outFile, page, readRegStr,
                                   requestExecutionLevel, rmdir, section, setOutPath, str,
                                   strLength, uninstall, unsafeInject, unsafeInjectGlobal,
                                   loadLanguage, sleep, (@=), detailPrint, (%<), (%&&),
                                   not_, mutableInt_, mutable_, while, false, true, strShow, (&),
                                   writeRegDWORD, writeRegStr, (%/=), fileExists, execWait)
import           Prelude ((!!))
import qualified System.IO as IO
import qualified Options.Applicative as O


data CliOptions = CliOptions
  { cliSpacedName :: Text
  , cliInstallDirectory :: Text
  , cliFullVersion :: Text
  , cliOutName :: Text
  , cliIconPath :: Text
  , cliBannerBmp :: Text
  , cliLockFile :: Text
  , cliContentsDirectory :: Text
  , cliShortcutExe :: Text
  , cliExtraExec :: [Text]
  }

cliOptionsParser :: O.Parser CliOptions
cliOptionsParser = CliOptions
  <$> O.strOption (O.long "spaced-name" <> O.metavar "NAME" {- <> O.help "" -})
  <*> O.strOption (O.long "install-dir" <> O.metavar "DIR")
  <*> O.strOption (O.long "full-version" <> O.metavar "VER")
  <*> O.strOption (O.long "out-name" <> O.metavar "NAME")
  <*> O.strOption (O.long "icon-path" <> O.metavar "ICO")
  <*> O.strOption (O.long "banner-bmp" <> O.metavar "BMP")
  <*> O.strOption (O.long "lock-file" <> O.metavar "FILE")
  <*> O.strOption (O.long "contents-dir" <> O.metavar "DIR")
  <*> O.strOption (O.long "shortcut-exe" <> O.metavar "EXE")
  <*> many (O.strOption (O.long "extra-exec" <> O.metavar "CMD"))

main :: IO ()
main = do
  cliOptions <- O.execParser (O.info (cliOptionsParser <**> O.helper) O.fullDesc)
  writeUninstallerNSIS cliOptions
  writeInstallerNSIS cliOptions

------------------- adapted from Daedalus: -------------------

-- For use in `unsafeInject` and `unsafeInjectGlobal`.
-- Based on <https://github.com/ndmitchell/nsis/blob/b03efa8ad4474994b609325a8b94a83c7ee44417/src/Development/NSIS/Type.hs#L35C1-L48C22>
escapeLiteralString :: String -> String
escapeLiteralString s = "\"" <> concatMap g s <> "\""
  where
    g '\"' = "$\\\""
    g '\r' = "$\\r"
    g '\n' = "$\\n"
    g '\t' = "$\\t"
    g '$' = "$$"
    g x = [x]

desktopShortcut :: CliOptions -> [Attrib]
desktopShortcut CliOptions{..} =
        [ Target $ fromString $ T.unpack $ "$INSTDIR\\" <> cliShortcutExe
        , IconFile $ fromString $ T.unpack $ "$INSTDIR\\" <> cliShortcutExe
        , StartOptions "SW_SHOWMINIMIZED"
        , IconIndex 0
        ]

-- See INNER blocks at http://nsis.sourceforge.net/Signing_an_Uninstaller
writeUninstallerNSIS :: CliOptions -> IO ()
writeUninstallerNSIS CliOptions{..} =
    IO.writeFile "uninstaller.nsi" $ nsis $ do
        _ <- constantStr "Version" (str $ T.unpack cliFullVersion)
        _ <- constantStr "InstallDir" (str $ T.unpack $ cliInstallDirectory)
        _ <- constantStr "SpacedName" (str $ T.unpack $ cliSpacedName)
        unsafeInjectGlobal "Unicode true"

        loadLanguage "English"
        loadLanguage "Japanese"

        name "$SpacedName Uninstaller $Version"
        outFile "tempinstaller.exe"
        unsafeInjectGlobal "SetCompress off"

        _ <- section "" [Required] $ do
            unsafeInject "WriteUninstaller \"c:\\uninstall.exe\""

        uninstall $ do
            -- Remove registry keys
            deleteRegKey HKLM "Software/Microsoft/Windows/CurrentVersion/Uninstall/$SpacedName"
            deleteRegKey HKLM "Software/$SpacedName"
            rmdir [Recursive,RebootOK] "$INSTDIR"
            delete [] "$SMPROGRAMS/$SpacedName/*.*"
            delete [] "$DESKTOP\\$SpacedName.lnk"
            -- Note: we leave user data alone

parseVersion :: Text -> [String]
parseVersion ver =
    case T.split (== '.') (toText ver) of
        v@[_, _, _, _] -> map toString v
        _              -> ["0", "0", "0", "0"]

writeInstallerNSIS :: CliOptions -> IO ()
writeInstallerNSIS CliOptions{..} = do
    let fullVersion = T.unpack cliFullVersion
        viProductVersion = Data.List.intercalate "." $ parseVersion cliFullVersion
    putStrLn $ "VIProductVersion: " <> T.pack viProductVersion
    putStrLn $ "escaped cliIconPath: " <> (T.pack . escapeLiteralString . T.unpack) cliIconPath

    IO.writeFile "installer.nsi" $ nsis $ do
        _ <- constantStr "Version" (str fullVersion)
        _ <- constantStr "InstallDir" (str $ T.unpack cliInstallDirectory)
        _ <- constantStr "SpacedName" (str $ T.unpack cliSpacedName)
        name "$SpacedName ($Version)"                  -- The name of the installer
        outFile $ str $ T.unpack cliOutName        -- Where to produce the installer
        unsafeInjectGlobal $ "!define MUI_ICON " <> (escapeLiteralString . T.unpack) cliIconPath
        unsafeInjectGlobal $ "!define MUI_HEADERIMAGE"
        unsafeInjectGlobal $ "!define MUI_HEADERIMAGE_BITMAP " <> (escapeLiteralString . T.unpack) cliBannerBmp
        unsafeInjectGlobal $ "!define MUI_HEADERIMAGE_RIGHT"
        unsafeInjectGlobal $ "!include WinVer.nsh"
        unsafeInjectGlobal $ "VIProductVersion " <> viProductVersion
        unsafeInjectGlobal $ "VIAddVersionKey \"ProductVersion\" " <> fullVersion
        unsafeInjectGlobal "Unicode true"
        requestExecutionLevel Highest -- TODO: needed?

        installDir "$PROGRAMFILES64\\$SpacedName"                   -- Default installation directory...
        installDirRegKey HKLM "Software/$SpacedName" "Install_Dir"  -- ...except when already installed.

        loadLanguage "English"
        loadLanguage "Japanese"
        mapM_ unsafeInjectGlobal
          [ "LangString AlreadyRunning ${LANG_ENGLISH} \"is running. It needs to be fully shut down before running the installer!\""
          , "LangString AlreadyRunning ${LANG_JAPANESE} \"が起動中です。 インストーラーを実行する前に完全にシャットダウンする必要があります！\""
          , "LangString TooOld ${LANG_ENGLISH} \"This version of Windows is not supported. Windows 8.1 or above required.\""
          , "LangString TooOld ${LANG_JAPANESE} \"このWindowsバージョンはサポートされていません。Windows 8.1以降が必要です。\""
          ]

        mapM_ unsafeInject [
            "${IfNot} ${AtLeastWin8.1}"
          , "  MessageBox MB_OK \"$(TooOld)\""
          , "  Quit"
          , "${EndIf}"
          ]

        page Directory                   -- Pick where to install
        _ <- constant "INSTALLEDAT" $ readRegStr HKLM "Software/$SpacedName" "Install_Dir"
        onPagePre Directory (iff_ (strLength "$INSTALLEDAT" %/= 0) $ abort "")

        page InstFiles                   -- Give a progress bar while installing

        _ <- section "" [Required] $ do
                setOutPath "$INSTDIR"        -- Where to install files in this section
                unsafeInject "AllowSkipFiles off"
                writeRegStr HKLM "Software/$SpacedName" "Install_Dir" "$INSTDIR" -- Used by launcher batch script

                -- XXX: sometimes during auto-update, it takes longer for the app to exit,
                -- and cardano-launcher.exe’s lockfile to be unlocked (deletable), so
                -- let’s loop waiting for this to happen:
                let waitSeconds = 30
                lockfileCounter <- mutableInt_ 0
                lockfileDeleted <- mutable_ false
                while ((lockfileCounter %< waitSeconds) %&& (not_ lockfileDeleted)) $ do
                    detailPrint (
                        "Checking if "
                        Development.NSIS.& str (T.unpack cliSpacedName)
                        Development.NSIS.& " is not running ("
                        Development.NSIS.& strShow (lockfileCounter + 1)
                        Development.NSIS.& "/"
                        Development.NSIS.& strShow waitSeconds
                        Development.NSIS.& ")..."
                        )
                    lockfileDeleted @= true
                    onError (delete [] (fromString . T.unpack $ cliLockFile)) $ do
                        lockfileDeleted @= false
                    iff_ (not_ lockfileDeleted) $ do
                        sleep 1000 -- milliseconds
                    lockfileCounter @= lockfileCounter + 1
                iff_ (not_ (lockfileDeleted)) $ do
                    unsafeInject $ T.unpack $ "Abort \"" <> cliInstallDirectory <> " $(AlreadyRunning)\""

                iff_ (fileExists "$INSTDIR") $ do
                  detailPrint "Removing previously installed version"
                  rmdir [Recursive] "$INSTDIR"

                file [Recursive] (str $ T.unpack cliContentsDirectory)

                forM_ cliExtraExec $ \extraExec -> do
                  execWait (fromString (T.unpack extraExec))

                createShortcut "$DESKTOP\\$SpacedName.lnk" (desktopShortcut CliOptions{..})

                -- Uninstaller
                let
                    uninstallKey = "Software/Microsoft/Windows/CurrentVersion/Uninstall/$SpacedName"
                do
                    writeRegStr HKLM uninstallKey "InstallLocation" "$INSTDIR"
                    writeRegStr HKLM uninstallKey "Publisher" "IOHK"
                    writeRegStr HKLM uninstallKey "ProductVersion" (str fullVersion)
                    writeRegStr HKLM uninstallKey "VersionMajor" (str . (!! 0). parseVersion $ cliFullVersion)
                    writeRegStr HKLM uninstallKey "VersionMinor" (str . (!! 1). parseVersion $ cliFullVersion)
                    writeRegStr HKLM uninstallKey "DisplayName" "$SpacedName"
                    writeRegStr HKLM uninstallKey "DisplayVersion" (str fullVersion)
                    writeRegStr HKLM uninstallKey "UninstallString" "\"$INSTDIR/uninstall.exe\""
                    writeRegStr HKLM uninstallKey "QuietUninstallString" "\"$INSTDIR/uninstall.exe\" /S"
                    writeRegDWORD HKLM uninstallKey "NoModify" 1
                    writeRegDWORD HKLM uninstallKey "NoRepair" 1
                file [] "uninstall.exe"

        -- this string never appears in the UI
        _ <- section "Start Menu Shortcuts" [] $ do
                createDirectory "$SMPROGRAMS/$SpacedName"
                createShortcut "$SMPROGRAMS/$SpacedName/Uninstall $SpacedName.lnk"
                    [Target "$INSTDIR/uninstall.exe", IconFile "$INSTDIR/uninstall.exe", IconIndex 0]
                createShortcut "$SMPROGRAMS/$SpacedName/$SpacedName.lnk" (desktopShortcut CliOptions{..})
        return ()
