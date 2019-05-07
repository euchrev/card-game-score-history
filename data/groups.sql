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


CREATE TABLE games (
id SERIAL PRIMARY KEY,
date BIGINT,
winning_team INTEGER [],
losing_team  INTEGER [],
notes VARCHAR(255),
groups_id INTEGER NOT NULL,
FOREIGN KEY (groups_id ) REFERENCES groups (id),
);


-- ALTER TABLE books ADD CONSTRAINT fk_bookshelves FOREIGN KEY (bookshelf_id) REFERENCES bookshelves(id);