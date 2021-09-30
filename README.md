denon start

Install PostgreSQL
E.g. https://www.tecmint.com/install-postgresql-and-pgadmin-in-ubuntu/

sudo -i -u postgres
psql
\q
exit

create database results;
\c results

Set username and password and configure it in the script.json file. An example file is provided.

Example request from command line:
curl -i -X POST -F "data=@testimine.txt" http://localhost:7700/upload
