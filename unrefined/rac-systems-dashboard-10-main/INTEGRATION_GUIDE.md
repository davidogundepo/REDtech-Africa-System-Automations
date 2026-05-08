
# DiceyTech Platform - Database & API Integration Guide

**REDtech Africa & David Ogundepo**  
*Complete Integration Documentation for Django & AWS*

---

## 🎯 Overview

This guide provides comprehensive instructions for connecting the DiceyTech platform frontend to a Django backend with AWS infrastructure. The platform is designed to seamlessly integrate with modern backend technologies while maintaining scalability and performance.

**Architecture Stack:**
- **Frontend**: React + TypeScript (Current Implementation)
- **Backend**: Django + Django REST Framework
- **Database**: PostgreSQL on AWS RDS
- **Storage**: AWS S3 for file uploads
- **Caching**: Redis on AWS ElastiCache
- **Deployment**: AWS EC2/ECS with Load Balancers

---

## 🚀 Quick Start Integration

### 1. Django Backend Setup

```bash
# Create Django project
django-admin startproject diceytech_backend
cd diceytech_backend

# Install required packages
pip install django djangorestframework django-cors-headers
pip install psycopg2-binary boto3 django-storages redis
pip install django-allauth djangorestframework-simplejwt
pip install pillow python-decouple celery

# Create core apps
python manage.py startapp authentication
python manage.py startapp hackathons
python manage.py startapp projects
python manage.py startapp profiles
python manage.py startapp notifications
```

### 2. AWS Services Configuration

```python
# settings.py - AWS Configuration
import os
from decouple import config

# AWS Settings
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Storage Configuration
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.StaticS3Boto3Storage'

# Database Configuration (AWS RDS)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Redis Configuration (AWS ElastiCache)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

---

## 📊 Database Models

### User Profile Model
```python
# profiles/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True)
    location = models.CharField(max_length=100, blank=True)
    github_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    skills = models.ManyToManyField('Skill', blank=True)
    experience_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced')
        ],
        default='beginner'
    )
    total_points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Skill(models.Model):
    name = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
```

### Hackathon Models
```python
# hackathons/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Hackathon(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced')
    ]
    
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled')
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField()
    prizes = models.JSONField(default=list)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    max_participants = models.IntegerField(null=True, blank=True)
    registration_deadline = models.DateTimeField()
    banner_image = models.ImageField(upload_to='hackathons/', blank=True)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_hackathons')
    participants = models.ManyToManyField(User, through='HackathonParticipation', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class HackathonParticipation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE)
    team_name = models.CharField(max_length=100, blank=True)
    submission_url = models.URLField(blank=True)
    submission_description = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rank = models.IntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
```

### Project Models
```python
# projects/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Project(models.Model):
    CATEGORY_CHOICES = [
        ('web', 'Web Development'),
        ('mobile', 'Mobile Development'),
        ('ai_ml', 'AI/Machine Learning'),
        ('blockchain', 'Blockchain'),
        ('iot', 'Internet of Things'),
        ('game', 'Game Development'),
        ('other', 'Other')
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    technologies = models.ManyToManyField('profiles.Skill', blank=True)
    github_url = models.URLField(blank=True)
    live_url = models.URLField(blank=True)
    image = models.ImageField(upload_to='projects/', blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_projects')
    collaborators = models.ManyToManyField(User, blank=True, related_name='collaborated_projects')
    likes = models.ManyToManyField(User, blank=True, related_name='liked_projects')
    saved_by = models.ManyToManyField(User, blank=True, related_name='saved_projects')
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
```

---

## 🔗 API Endpoints Structure

### Authentication Endpoints
```python
# authentication/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
]
```

### Frontend Integration Points

#### 1. Authentication Context Integration
```typescript
// src/contexts/AuthContext.tsx - API Integration Points
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Login function integration
const login = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser(data.user);
    return data;
  } catch (error) {
    throw error;
  }
};
```

#### 2. Profile Page Integration
```typescript
// Integration for Profile page (src/pages/Profile.tsx)
const updateProfile = async (profileData: FormData) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_BASE_URL}/profiles/update/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: profileData, // FormData for file uploads
  });
  
  if (!response.ok) throw new Error('Profile update failed');
  return response.json();
};

// Skills integration
const getAvailableSkills = async () => {
  const response = await fetch(`${API_BASE_URL}/profiles/skills/`);
  return response.json();
};
```

#### 3. Hackathons Integration
```typescript
// Integration for Hackathons page (src/pages/Hackathons.tsx)
const getHackathons = async (filters?: any) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/hackathons/?${params}`);
  return response.json();
};

const joinHackathon = async (hackathonId: number, teamData: any) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_BASE_URL}/hackathons/${hackathonId}/join/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teamData),
  });
  
  return response.json();
};
```

#### 4. Projects Integration
```typescript
// Integration for Project pages
const getProjects = async (filters?: any) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/projects/?${params}`);
  return response.json();
};

const likeProject = async (projectId: number) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/like/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};

const saveProject = async (projectId: number) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/save/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

---

## 📱 Real-time Features Integration

### WebSocket Configuration
```python
# Django Channels for real-time notifications
# asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from notifications.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'diceytech_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

### Frontend WebSocket Integration
```typescript
// src/hooks/useWebSocket.ts
export const useWebSocket = (userId: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(`ws://localhost:8000/ws/notifications/${userId}/?token=${token}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications(prev => [data, ...prev]);
    };
    
    setSocket(ws);
    
    return () => ws.close();
  }, [userId]);

  return { socket, notifications };
};
```

---

## 🔧 Environment Configuration

### Django Environment Variables
```bash
# .env file for Django backend
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/dbname

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=diceytech-media
AWS_S3_REGION_NAME=us-east-1

# Redis Configuration
REDIS_URL=redis://your-elasticache-endpoint:6379/0

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Social Auth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Frontend Environment Variables
```bash
# .env file for React frontend
REACT_APP_API_URL=https://api.diceytech.com
REACT_APP_WS_URL=wss://api.diceytech.com
REACT_APP_AWS_S3_BUCKET=diceytech-media
REACT_APP_ENVIRONMENT=production
```

---

## 🚀 Deployment Configuration

### Docker Configuration
```dockerfile
# Dockerfile for Django backend
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "diceytech_backend.wsgi:application"]
```

### AWS ECS Task Definition
```json
{
  "family": "diceytech-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "django-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/diceytech-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://..."
        }
      ]
    }
  ]
}
```

---

## 📊 Performance Optimization

### Caching Strategy
```python
# Django caching implementation
from django.core.cache import cache
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # Cache for 15 minutes
def hackathon_list(request):
    # View logic here
    pass

# Custom caching for complex queries
def get_user_dashboard_data(user_id):
    cache_key = f"dashboard_{user_id}"
    data = cache.get(cache_key)
    
    if not data:
        data = {
            'projects': user.created_projects.count(),
            'hackathons': user.hackathonparticipation_set.count(),
            'achievements': user.achievements.count(),
        }
        cache.set(cache_key, data, 60 * 30)  # Cache for 30 minutes
    
    return data
```

### Database Optimization
```python
# Optimized queries with select_related and prefetch_related
def get_hackathons_optimized():
    return Hackathon.objects.select_related('organizer').prefetch_related(
        'participants', 'technologies'
    ).filter(status='active')

# Database indexing
class Hackathon(models.Model):
    # ... other fields
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'start_date']),
            models.Index(fields=['difficulty', 'created_at']),
        ]
```

---

## 🔐 Security Implementation

### JWT Authentication
```python
# Custom JWT authentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['user_id'] = user.id
        token['email'] = user.email
        token['full_name'] = user.full_name
        
        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
```

### CORS Configuration
```python
# settings.py - CORS configuration
CORS_ALLOWED_ORIGINS = [
    "https://diceytech.com",
    "https://app.diceytech.com",
    "http://localhost:3000",  # Development
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

---

## 📋 Testing Strategy

### Backend Testing
```python
# tests/test_hackathons.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from hackathons.models import Hackathon

User = get_user_model()

class HackathonTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
    def test_hackathon_creation(self):
        hackathon = Hackathon.objects.create(
            title='Test Hackathon',
            description='Test description',
            organizer=self.user,
            # ... other required fields
        )
        
        self.assertEqual(hackathon.title, 'Test Hackathon')
        self.assertEqual(hackathon.organizer, self.user)
```

### Frontend Testing Integration
```typescript
// src/utils/testUtils.ts - API mocking for tests
export const mockApiResponse = (endpoint: string, response: any) => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      });
    }
    return Promise.reject(new Error('API endpoint not mocked'));
  });
};
```

---

## 📈 Monitoring & Analytics

### Django Logging Configuration
```python
# settings.py - Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'django.log',
        },
        'cloudwatch': {
            'level': 'INFO',
            'class': 'watchtower.CloudWatchLogHandler',
            'boto3_session': boto3.Session(),
            'log_group': 'diceytech-backend',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'cloudwatch'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Performance Monitoring
```python
# Custom middleware for performance monitoring
class PerformanceMonitoringMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        
        # Log slow requests
        if duration > 1.0:  # Requests taking more than 1 second
            logger.warning(f"Slow request: {request.path} took {duration:.2f}s")
        
        return response
```

---

## 🔄 Data Migration Strategy

### User Data Migration
```python
# management/commands/migrate_user_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Migrate user data from legacy system'

    def handle(self, *args, **options):
        # Migration logic here
        self.stdout.write(
            self.style.SUCCESS('Successfully migrated user data')
        )
```

---

## 🎯 Next Steps for Implementation

### Phase 1: Core Setup (Week 1-2)
1. Set up Django project with basic models
2. Configure AWS services (RDS, S3, ElastiCache)
3. Implement authentication system
4. Set up basic API endpoints

### Phase 2: Feature Implementation (Week 3-6)
1. Implement hackathon management system
2. Build project showcase functionality  
3. Create user profile management
4. Add notification system

### Phase 3: Advanced Features (Week 7-10)
1. Implement real-time features with WebSockets
2. Add search and filtering capabilities
3. Build analytics and reporting
4. Implement caching and optimization

### Phase 4: Production Deployment (Week 11-12)
1. Set up production AWS infrastructure
2. Implement monitoring and logging
3. Configure CI/CD pipelines
4. Performance testing and optimization

---

## 🤝 Support & Maintenance

**REDtech Africa Development Team**  
Email: tech-support@redtechafrica.com  

**David Ogundepo - Lead Architect**  
Email: david.ogundepo@diceytech.com  

**Documentation Updates**  
This guide is updated regularly. Check the DiceyTech platform repository for the latest version.

---

*This integration guide ensures seamless connection between the DiceyTech frontend and your Django/AWS backend infrastructure. Follow the implementation phases for systematic deployment.*

**Last Updated:** December 2024  
**Version:** 2.1  
**Maintained by:** REDtech Africa & David Ogundepo
