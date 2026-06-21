@echo off
echo Liberando porta 5000 no Firewall do Windows...
netsh advfirewall firewall add rule name="Legacy Moving Backend" dir=in action=allow protocol=TCP localport=5000
echo.
echo Porta 5000 liberada!
pause
