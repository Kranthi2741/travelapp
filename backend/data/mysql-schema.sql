-- Roamly database schema
-- Run this script in MySQL Workbench.

CREATE DATABASE IF NOT EXISTS travelapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE travelapp;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NULL,
  bio VARCHAR(280) NOT NULL DEFAULT '',
  avatar VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS destinations (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  state VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image TEXT NOT NULL,
  distance VARCHAR(120) NOT NULL,
  note VARCHAR(500) NOT NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL
);

CREATE TABLE IF NOT EXISTS states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  is_union_territory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_district_state (state_id, name),
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS places (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state_id INT NOT NULL,
  district_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  note VARCHAR(600) NOT NULL DEFAULT '',
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  source VARCHAR(255) NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_place_district (district_id, name),
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
  FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  story TEXT NOT NULL,
  place VARCHAR(240) NOT NULL,
  destination_id INT NULL,
  directory_key VARCHAR(600) NULL,
  visit_date DATE NOT NULL,
  tags JSON NOT NULL,
  image_url TEXT NOT NULL,
  images JSON NOT NULL,
  image_count INT NOT NULL DEFAULT 0,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(120) NOT NULL,
  destination_name VARCHAR(160) NOT NULL,
  media_type VARCHAR(32) NOT NULL,
  visible_to_friends BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  destination_id INT NULL,
  directory_key VARCHAR(600) NULL,
  place JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_destination (user_id, destination_id),
  UNIQUE KEY uq_user_directory (user_id, directory_key)
);

CREATE TABLE IF NOT EXISTS visits (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  destination_id INT NULL,
  directory_key VARCHAR(600) NULL,
  place JSON NULL,
  visit_date DATE NOT NULL,
  memory_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id CHAR(36) NOT NULL,
  achievement_id VARCHAR(80) NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id CHAR(36) PRIMARY KEY,
  sender_id CHAR(36) NOT NULL,
  receiver_id CHAR(36) NOT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_friend_request (sender_id, receiver_id),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id CHAR(36) NOT NULL,
  friend_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_friend_shares (
  memory_id CHAR(36) NOT NULL,
  friend_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (memory_id, friend_id),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_likes (
  memory_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (memory_id, user_id),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_comments (
  id CHAR(36) PRIMARY KEY,
  memory_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Friends feature indexes (safe to run once; ignore "duplicate key name" errors on re-run)
CREATE INDEX idx_friend_requests_receiver ON friend_requests (receiver_id, status);
CREATE INDEX idx_friendships_friend ON friendships (friend_id);
CREATE INDEX idx_memory_shares_friend ON memory_friend_shares (friend_id);
CREATE INDEX idx_memory_comments_memory ON memory_comments (memory_id, created_at);
CREATE INDEX idx_memories_user_created ON memories (user_id, created_at);
CREATE INDEX idx_users_name ON users (name);
