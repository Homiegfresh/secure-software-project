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
    displayname VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    catid INT NOT NULL UNIQUE,  -- strict 1:1 (each player must have exactly one cat)
    CONSTRAINT fk_cat FOREIGN KEY (catid) REFERENCES cat (id) ON DELETE RESTRICT
);