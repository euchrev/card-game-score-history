DROP TABLE IF Exists groups, group_members, group_teams, games; 


CREATE TABLE groups (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
email VARCHAR(255),
password VARCHAR(255)
);

CREATE TABLE group_members (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
groups_id INTEGER NOT NULL,
FOREIGN KEY (groups_id) REFERENCES groups (id)
);

CREATE TABLE group_teams (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
members VARCHAR(255),
wins smallINT,
losses smallINT,
groups_id INTEGER NOT NULL,
FOREIGN KEY (groups_id) REFERENCES groups (id)
);

CREATE TABLE games (
id SERIAL PRIMARY KEY,
date BIGINT,
winning_team VARCHAR(255),
loosing_team  smallINT,
notes VARCHAR(255),
groups_id INTEGER NOT NULL,
group_teams_id INTEGER NOT NULL,
FOREIGN KEY (groups_id ) REFERENCES groups (id),
FOREIGN KEY (group_teams_id ) REFERENCES groups (id)

);


-- ALTER TABLE books ADD CONSTRAINT fk_bookshelves FOREIGN KEY (bookshelf_id) REFERENCES bookshelves(id);