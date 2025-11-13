-- Drop tables if they already exist (drop in dependency order)
DROP TABLE IF EXISTS player CASCADE;
DROP TABLE IF EXISTS cat CASCADE;
DROP TABLE IF EXISTS item CASCADE;

-- ==========================
-- Item Table
-- ==========================
CREATE TABLE item (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    name VARCHAR(100) GENERATED ALWAYS AS (color || ' ' || type) STORED
);

-- ==========================
-- Cat Table
-- ==========================
CREATE TABLE cat (
    id SERIAL PRIMARY KEY,
    color VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age >= 0),
    itemid INT NULL UNIQUE,
    CONSTRAINT fk_item FOREIGN KEY (itemid) REFERENCES item (id) ON DELETE RESTRICT
);

-- ==========================
-- Player Table
-- ==========================
CREATE TABLE player (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    displayName VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    catId INT NULL,  -- optional reference to cat; may be NULL
    CONSTRAINT fk_cat FOREIGN KEY (catId) REFERENCES cat (id) ON DELETE SET NULL
);

-- Seed data (passwords are legacy plaintext; they will be re-hashed on first successful login)
INSERT INTO player (firstname, lastname, displayname, username, password)
VALUES 
  ('Ian', 'McLeod', 'Ian McLeod', 'ian', 'password'),
  ('Chloe', 'Goff', 'Chloe Goff', 'chloe', 'password'),
  ('Liem', 'Wow', 'Liem WOW', 'liem', 'password'),
  ('Liem', 'Chau', 'Liem Chau', 'liem2', '12345678'),
  ('Jadaea', 'Locket', 'Jadaea Locket', 'jadaea', 'password');
