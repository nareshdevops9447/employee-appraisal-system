@echo off
echo Resetting Database and Seeding Demo Data...
docker cp backend/seed_demo.py eas-backend:/app/seed_demo.py
docker exec eas-backend python seed_demo.py
echo.
echo Database reset complete! Personas ready:
echo   - Alice (HR Admin): alice.smith@example.com / password
echo   - Charlie (Manager): charlie.brown@example.com / password
echo   - David (Employee, NEW): david.wilson@example.com / password
pause
