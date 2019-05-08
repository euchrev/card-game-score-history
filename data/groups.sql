DROP TABLE IF Exists groups, group_members, games;


CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  paid BOOL NOT NULL
);

CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  group_id INTEGER NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups (id)
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  date BIGINT,
  winning_team INTEGER[],
  losing_team  INTEGER[],
  notes VARCHAR(255),
  group_id INTEGER NOT NULL,
  FOREIGN KEY (group_id ) REFERENCES groups (id)
);