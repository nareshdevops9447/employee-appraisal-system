@echo off
echo =======================================================
echo Employee Appraisal System - Demo Data Reset
echo =======================================================
echo.
echo Wiping database and inserting standard demo personas...
echo.

docker cp backend/seed_demo.py eas-backend:/app/seed_demo.py
docker exec eas-backend python seed_demo.py

echo.
echo =======================================================
echo Reset Complete!
echo You can now log in with the demo accounts.
echo =======================================================
pause
