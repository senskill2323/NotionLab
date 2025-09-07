@echo off
REM Build and deploy script for NotionLab (Windows)
echo Building NotionLab...

REM Clean previous build
if exist dist rmdir /s /q dist

REM Build the project
call npm run build

REM Verify build completed successfully
if not exist "dist\index.html" (
    echo ❌ Build failed - index.html not found
    exit /b 1
)

echo ✅ Build completed successfully

REM Show current asset hashes for verification
echo 📦 Current asset files:
dir dist\assets\

echo 🎉 Ready for deployment!
echo Make sure to upload the entire dist\ folder to your server
echo The .htaccess file has been updated to prevent asset fallback issues
