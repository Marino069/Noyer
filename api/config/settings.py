from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "django_filters",
    "corsheaders",
    "axes",
    "config",
    "catalogue",
    "inventaire",
    "panier",
    "commande",
    "paiement",
    "contact",
    "newsletter",
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Doit rester en dernier
    'axes.middleware.AxesMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases

# DATABASE_URL : mysql://utilisateur:motdepasse@hote:3306/noyer
# Les migrations se lancent avec adm_noyer, l'application tourne avec app_noyer.
DATABASES = {
    "default": env.db("DATABASE_URL"),
}
DATABASES["default"]["OPTIONS"] = {"charset": "utf8mb4"}


# Cache : Redis (paniers, cache, compteurs de limitation)
# REDIS_URL : redis://redis:6379/0
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 2,
            "SOCKET_TIMEOUT": 2,
        },
    },
}


# Administration : connexion sécurisée
# Adresse non devinable (jamais /admin/), configurable par variable d'environnement
ADMIN_URL = env("ADMIN_URL", default="atelier-k7q2x9m4/").strip("/") + "/"

# Mots de passe hachés avec Argon2
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# django-axes : blocage temporaire après 5 échecs de connexion
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
AXES_FAILURE_LIMIT = env.int("AXES_FAILURE_LIMIT", default=5)
AXES_COOLOFF_TIME = timedelta(minutes=env.int("AXES_COOLOFF_MINUTES", default=30))
AXES_LOCKOUT_PARAMETERS = [["ip_address", "username"]]
AXES_RESET_ON_SUCCESS = True

# Cookies de session et CSRF : Secure et HttpOnly en production
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = env("STATIC_ROOT", default=str(BASE_DIR / "staticfiles"))

# Photos téléversées : dans un volume Docker pour survivre aux redémarrages
MEDIA_URL = "media/"
MEDIA_ROOT = env("MEDIA_ROOT", default=str(BASE_DIR / "media"))


# API : format d'erreur standard et documentation OpenAPI

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "config.exceptions.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API Noyer",
    "DESCRIPTION": "Boutique en ligne de lampes artisanales (Genève).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# CORS : seule l'URL du front est autorisée
FRONT_URL = env("FRONT_URL", default="http://localhost:3000").rstrip("/")
CORS_ALLOWED_ORIGINS = [FRONT_URL]
# URL publique de l'API (liens de confirmation envoyés par email)
API_PUBLIC_URL = env("API_PUBLIC_URL", default="http://localhost:8000").rstrip("/")
# Le front envoie le cookie du panier (credentials: "include")
CORS_ALLOW_CREDENTIALS = True

# Cookie du panier : domaine partagé entre front et API (ex. ".noyer.ch"), vide en local
PANIER_COOKIE_DOMAIN = env("PANIER_COOKIE_DOMAIN", default="") or None
PANIER_COOKIE_SECURE = env.bool("PANIER_COOKIE_SECURE", default=not DEBUG)

# Montants du panier (centimes entiers). TVA en centièmes de pour cent : 810 = 8,1 %.
TVA_TAUX_CENTIEMES = env.int("TVA_TAUX_CENTIEMES", default=810)
FRAIS_LIVRAISON_CENTIMES = env.int("FRAIS_LIVRAISON_CENTIMES", default=0)

# Les erreurs 500 sont journalisées, jamais renvoyées au client
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"noyer.api": {"handlers": ["console"], "level": "ERROR", "propagate": True}},
}


# Email
# https://docs.djangoproject.com/en/6.1/topics/email/#topic-email-configuration

EMAIL_BACKEND_CLASSE = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)
MAILERS = {"default": {"BACKEND": EMAIL_BACKEND_CLASSE}}
if EMAIL_BACKEND_CLASSE.endswith("smtp.EmailBackend"):
    # SMTP du prestataire (Infomaniak, Brevo…) : identifiants uniquement par variables d'environnement
    MAILERS["default"]["OPTIONS"] = {
        "host": env("EMAIL_HOST", default="localhost"),
        "port": env.int("EMAIL_PORT", default=587),
        "username": env("EMAIL_HOST_USER", default=""),
        "password": env("EMAIL_HOST_PASSWORD", default=""),
        "use_tls": env.bool("EMAIL_USE_TLS", default=True),
        "timeout": env.int("EMAIL_TIMEOUT", default=10),
    }

ATELIER_EMAIL = env("ATELIER_EMAIL", default="atelier@noyer.ch")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Noyer <commandes@noyer.ch>")

# Paiement : Stripe Checkout (clés uniquement par variables d'environnement)
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
# Virement bancaire (Premium) : coordonnées de l'atelier et délai en jours ouvrés
VIREMENT_IBAN = env("VIREMENT_IBAN", default="")
VIREMENT_BENEFICIAIRE = env("VIREMENT_BENEFICIAIRE", default="Noyer")
VIREMENT_DELAI_JOURS = env.int("VIREMENT_DELAI_JOURS", default=5)

# Échecs d'envoi d'email : journalisés (la commande n'est jamais annulée)
LOGGING["loggers"]["noyer.emails"] = LOGGING["loggers"]["noyer.api"] | {"level": "INFO"}
