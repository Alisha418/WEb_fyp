# Django Backend Setup Required

## ⚠️ Current Issue
The React frontend is getting **401 Unauthorized** errors from the Django backend.

## ✅ Solution: Disable Authentication for Development

### Step 1: Edit Django `settings.py`

Add or modify the `REST_FRAMEWORK` configuration:

```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}
```

**Location:** Find `settings.py` in your Django project and add this configuration.

### Step 2: Make Sure Django Listens on Network Interface

Restart Django with:
```bash
python manage.py runserver 0.0.0.0:8000
```

**Important:** Use `0.0.0.0:8000` not `127.0.0.1:8000` so it's accessible from other machines on the network.

### Step 3: Verify CORS Settings (if needed)

Make sure your Django `settings.py` has:

```python
CORS_ALLOW_ALL_ORIGINS = True
# OR specifically allow the frontend IP:
CORS_ALLOWED_ORIGINS = [
    'http://10.200.22.108:3000',
    'http://localhost:3000',
]
```

### Step 4: Add IP to ALLOWED_HOSTS

```python
ALLOWED_HOSTS = [
    '10.200.22.108',
    'localhost',
    '127.0.0.1',
]
```

## 🚀 After Making These Changes

1. Restart Django: `python manage.py runserver 0.0.0.0:8000`
2. Refresh the React app: `http://10.200.22.108:3000/`
3. The API calls should now work ✅

## 📝 Files Modified
- Django `settings.py` - Add REST_FRAMEWORK configuration

## ⏱️ Time to Fix
~2 minutes to add the settings and restart Django
