@echo off
echo Running Time Travel Simulation...
echo (Fast-forwarding David Wilson's probation and completing appraisal)
docker cp backend/simulate_progression.py eas-backend:/app/simulate_progression.py
docker exec eas-backend python simulate_progression.py
echo.
echo Simulation complete! David Wilson's status has been updated.
pause
