# ─── Imagen base: PHP 8.2 con Apache incluido ───────────────────────────────
FROM php:8.2-apache

# ─── Extensiones PHP que necesita el proyecto ────────────────────────────────
RUN apt-get update && apt-get install -y \
    pkg-config \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libonig-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd \
        --with-freetype=/usr/include/ \
        --with-jpeg=/usr/include/ \
    && docker-php-ext-install pdo pdo_mysql gd mbstring \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ─── Instalar Composer ───────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ─── Habilitar mod_rewrite de Apache (por si lo necesitas luego) ─────────────
RUN a2enmod rewrite

# ─── Configurar Apache para que sirva desde /var/www/html ────────────────────
#     y permita .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# ─── Directorio de trabajo ───────────────────────────────────────────────────
WORKDIR /var/www/html

# NOTA: NO copiamos el código aquí adrede.
# El código viene del volumen montado en docker-compose.yml (sincronización en vivo).
# Así cualquier cambio local se refleja al instante en el contenedor.