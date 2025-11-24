-- Base de datos para el sistema de TecNM
CREATE DATABASE  tec_system;
USE tec_system;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar usuario admin por defecto
INSERT IGNORE INTO users (username, email, password, role) VALUES 
('Admin', 'admin@tec.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Tabla de instituciones (REEMPLAZA la tabla tecs)
CREATE TABLE IF NOT EXISTS institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    clave_cct VARCHAR(50) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    extension VARCHAR(10),
    correo VARCHAR(150),
    nombre_representante VARCHAR(150),
    puesto_representante VARCHAR(100),
    direccion TEXT,
    logo TEXT, -- Para almacenar base64 o URL
    estado ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de carreras (REEMPLAZA la tabla subjects)
CREATE TABLE IF NOT EXISTS careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    numero_carrera VARCHAR(50) UNIQUE NOT NULL,
    cantidad_alumnos INT DEFAULT 0,
    duracion_semestres INT DEFAULT 8,
    modalidad ENUM('Escolarizada', 'Mixta', 'Virtual') DEFAULT 'Escolarizada',
    turno ENUM('Matutino', 'Vespertino', 'Nocturno', 'Mixto') DEFAULT 'Matutino',
    fecha_registro DATE,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla intermedia para relación instituciones-carreras
CREATE TABLE IF NOT EXISTS institution_careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    career_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_institution_career (institution_id, career_id)
);