-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: db
-- Tiempo de generación: 22-02-2026 a las 19:38:53
-- Versión del servidor: 8.0.45
-- Versión de PHP: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `CertiFlow`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administradores`
--

CREATE TABLE `administradores` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `codigo` varchar(180) COLLATE utf8mb4_general_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `administradores`
--

INSERT INTO `administradores` (`id`, `usuario_id`, `codigo`, `activo`) VALUES
(2, 2, '8182bbea6467267b1aaa9e3c336c4c64', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos`
--

CREATE TABLE `eventos` (
  `id` int NOT NULL,
  `nombre_evento` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `imagen_certificado` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `imagen_width` int DEFAULT NULL,
  `imagen_height` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `eventos`
--

INSERT INTO `eventos` (`id`, `nombre_evento`, `imagen_certificado`, `imagen_width`, `imagen_height`) VALUES
(1, 'JETS 2022', '6997ff955554f_1771569045.jpg', 613, 793),
(2, 'JETS 2023', '6998000a21aeb_1771569162.jpg', 842, 1191),
(3, 'JETS 2024', '6998042d117be_1771570221.jpg', 2550, 3300),
(4, 'JETS 2025', '699805708fddf_1771570544.jpg', 3296, 2552);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `evento_campos`
--

CREATE TABLE `evento_campos` (
  `id` int NOT NULL,
  `evento_id` int NOT NULL,
  `campo` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `x_pct` decimal(6,3) NOT NULL,
  `y_pct` decimal(6,3) NOT NULL,
  `font_size` int DEFAULT '20',
  `font_style` varchar(5) COLLATE utf8mb4_general_ci DEFAULT 'B'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `evento_campos`
--

INSERT INTO `evento_campos` (`id`, `evento_id`, `campo`, `x_pct`, `y_pct`, `font_size`, `font_style`) VALUES
(55, 1, 'nro_certificado', 90.104, 98.096, 15, 'B'),
(56, 1, 'nombre_apellido', 50.911, 51.091, 20, 'B'),
(57, 2, 'nombre_apellido', 49.870, 44.369, 30, 'B'),
(58, 2, 'nro_certificado', 91.536, 97.981, 20, 'B'),
(59, 3, 'nombre_apellido', 50.781, 45.136, 90, 'B'),
(60, 3, 'nro_certificado', 88.932, 97.355, 75, 'B'),
(65, 4, 'nombre_apellido', 51.042, 51.359, 90, 'B'),
(66, 4, 'nro_certificado', 90.495, 96.766, 75, 'B');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `participaciones`
--

CREATE TABLE `participaciones` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `evento_id` int NOT NULL,
  `nro_certificado` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `estado_pago` enum('pendiente','pagado') COLLATE utf8mb4_general_ci DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `participaciones`
--

INSERT INTO `participaciones` (`id`, `usuario_id`, `evento_id`, `nro_certificado`, `estado_pago`) VALUES
(7, 1, 1, '123', 'pagado'),
(8, 1, 2, '1234', 'pagado'),
(9, 1, 3, '1235', 'pagado'),
(10, 1, 4, '1236', 'pagado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `contrasena` varchar(100) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `apellido`, `usuario`, `contrasena`) VALUES
(1, 'Cristian David', 'Ramirez Callejas', '636443', '25d55ad283aa400af464c76d713c07ad'),
(2, 'Administrador', 'CTE', 'admin', '8182bbea6467267b1aaa9e3c336c4c64');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `administradores`
--
ALTER TABLE `administradores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_admin_usuario` (`usuario_id`);

--
-- Indices de la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `evento_campos`
--
ALTER TABLE `evento_campos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_campo_evento` (`evento_id`,`campo`);

--
-- Indices de la tabla `participaciones`
--
ALTER TABLE `participaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participacion` (`usuario_id`,`evento_id`),
  ADD KEY `evento_id` (`evento_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `eventos`
--
ALTER TABLE `eventos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `evento_campos`
--
ALTER TABLE `evento_campos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT de la tabla `participaciones`
--
ALTER TABLE `participaciones`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `administradores`
--
ALTER TABLE `administradores`
  ADD CONSTRAINT `administradores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `evento_campos`
--
ALTER TABLE `evento_campos`
  ADD CONSTRAINT `evento_campos_ibfk_1` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `participaciones`
--
ALTER TABLE `participaciones`
  ADD CONSTRAINT `participaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `participaciones_ibfk_2` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
