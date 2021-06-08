deno run --allow-env --allow-net --allow-write app.ts 

Install PostgreSQL

sudo -i -u postgres
psql
\q
exit

create database results;
\c results

https://www.tecmint.com/install-postgresql-and-pgadmin-in-ubuntu/

aivo : Parool123
database : results

curl -i -X POST -F "data=@testimine.txt" http://localhost:7700/upload