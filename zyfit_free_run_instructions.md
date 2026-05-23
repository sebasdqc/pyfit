# Zyfit — Módulo Free Run: Instrucciones de Implementación

## Contexto del Proyecto

**Stack:**
- Frontend: React Native (con Expo)
- Backend: Django + Django REST Framework
- Base de datos: PostgreSQL
- Infraestructura: Digital Ocean

**Objetivo de este documento:** Implementar el módulo de **Free Run** — sesiones de running al aire libre con tracking GPS en tiempo real, mapa en vivo, métricas calculadas y pantalla de resumen post-sesión.

Este módulo es la base sobre la que se construirá después el módulo de **Planned Run**, por lo que la arquitectura debe ser extensible desde el inicio.

---

## 1. Backend — Django

### 1.1 Modelos

Crear el archivo `runs/models.py` con los siguientes modelos:

```python
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class RunSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ('free', 'Free Run'),
        ('planned', 'Planned Run'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='run_sessions')

    # Metadata
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Tipo — extensible para Planned Run
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='free')
    plan_session = models.ForeignKey(
        'plans.PlanSession',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='run_sessions'
    )  # FK preparada para el módulo de Planned Run (app 'plans' aún no existe)

    # Métricas agregadas (se calculan al completar la sesión)
    total_distance_m = models.FloatField(default=0)
    total_duration_s = models.IntegerField(default=0)
    avg_pace_s_per_km = models.IntegerField(default=0)
    best_pace_s_per_km = models.IntegerField(default=0)
    calories_burned = models.FloatField(default=0)
    elevation_gain_m = models.FloatField(default=0)
    avg_heart_rate = models.IntegerField(null=True, blank=True)  # preparado para HR monitor

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'session_type']),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.session_type} — {self.started_at:%Y-%m-%d %H:%M}"


class RunPoint(models.Model):
    session = models.ForeignKey(RunSession, on_delete=models.CASCADE, related_name='points')

    lat = models.FloatField()
    lng = models.FloatField()
    altitude_m = models.FloatField(null=True, blank=True)
    accuracy_m = models.FloatField()           # para filtrar puntos de baja calidad
    timestamp = models.DateTimeField()
    speed_m_s = models.FloatField(null=True, blank=True)  # velocidad instantánea del GPS

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['session', 'timestamp']),
        ]
```

> **Nota:** La FK `plan_session` apunta a `plans.PlanSession`. Mientras esa app no exista, usar `null=True, blank=True` y asegurarse de que las migraciones no fallen. Si Django lanza error por app inexistente, comentar esa FK temporalmente y restaurarla cuando se cree la app `plans`.

---

### 1.2 Serializers

Crear `runs/serializers.py`:

```python
from rest_framework import serializers
from .models import RunSession, RunPoint
import math


def haversine_distance(lat1, lng1, lat2, lng2):
    """Distancia en metros entre dos coordenadas GPS."""
    R = 6371000  # radio de la Tierra en metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class RunPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunPoint
        fields = ['id', 'lat', 'lng', 'altitude_m', 'accuracy_m', 'timestamp', 'speed_m_s']


class RunSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = ['started_at', 'session_type']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'active'
        return super().create(validated_data)


class RunSessionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = ['status', 'ended_at']

    def validate(self, data):
        if data.get('status') == 'completed' and not data.get('ended_at'):
            raise serializers.ValidationError("ended_at is required when completing a session.")
        return data

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.status == 'completed':
            self._calculate_metrics(instance)
        return instance

    def _calculate_metrics(self, session):
        """Calcula y guarda las métricas agregadas al completar la sesión."""
        points = list(session.points.filter(accuracy_m__lte=20).order_by('timestamp'))

        if len(points) < 2:
            return

        # Distancia total
        total_distance = 0
        for i in range(1, len(points)):
            total_distance += haversine_distance(
                points[i - 1].lat, points[i - 1].lng,
                points[i].lat, points[i].lng
            )

        # Duración total
        duration_s = int((session.ended_at - session.started_at).total_seconds())

        # Pace promedio (s/km)
        avg_pace = int((duration_s / (total_distance / 1000))) if total_distance > 0 else 0

        # Ganancia de elevación
        elevation_gain = sum(
            max(0, points[i].altitude_m - points[i - 1].altitude_m)
            for i in range(1, len(points))
            if points[i].altitude_m is not None and points[i - 1].altitude_m is not None
        )

        # Mejor pace (ventana deslizante de 1km)
        best_pace = self._calculate_best_pace(points)

        session.total_distance_m = total_distance
        session.total_duration_s = duration_s
        session.avg_pace_s_per_km = avg_pace
        session.best_pace_s_per_km = best_pace
        session.elevation_gain_m = elevation_gain
        session.save()

    def _calculate_best_pace(self, points):
        """Calcula el mejor pace en 1km con ventana deslizante."""
        best = float('inf')
        for i in range(len(points)):
            dist = 0
            for j in range(i + 1, len(points)):
                dist += haversine_distance(
                    points[j - 1].lat, points[j - 1].lng,
                    points[j].lat, points[j].lng
                )
                if dist >= 1000:
                    t = (points[j].timestamp - points[i].timestamp).total_seconds()
                    pace = int(t)
                    if pace < best:
                        best = pace
                    break
        return best if best != float('inf') else 0


class RunSessionDetailSerializer(serializers.ModelSerializer):
    points = RunPointSerializer(many=True, read_only=True)

    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'best_pace_s_per_km', 'calories_burned', 'elevation_gain_m',
            'avg_heart_rate', 'points', 'created_at'
        ]


class RunSessionListSerializer(serializers.ModelSerializer):
    """Versión ligera para el historial — sin puntos GPS."""
    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'created_at'
        ]
```

---

### 1.3 Views

Crear `runs/views.py`:

```python
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import RunSession, RunPoint
from .serializers import (
    RunSessionCreateSerializer,
    RunSessionUpdateSerializer,
    RunSessionDetailSerializer,
    RunSessionListSerializer,
    RunPointSerializer,
)


class RunSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RunSessionCreateSerializer
        return RunSessionListSerializer

    def get_queryset(self):
        return RunSession.objects.filter(user=self.request.user)


class RunSessionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return RunSessionUpdateSerializer
        return RunSessionDetailSerializer

    def get_queryset(self):
        return RunSession.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_run_points(request, pk):
    """
    Recibe un batch de puntos GPS y los guarda.
    Body: { "points": [ {lat, lng, altitude_m, accuracy_m, timestamp, speed_m_s}, ... ] }
    """
    session = get_object_or_404(RunSession, pk=pk, user=request.user)

    if session.status == 'completed':
        return Response(
            {'error': 'Cannot add points to a completed session.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = RunPointSerializer(data=request.data.get('points', []), many=True)
    if serializer.is_valid():
        RunPoint.objects.bulk_create([
            RunPoint(session=session, **point) for point in serializer.validated_data
        ])
        return Response({'saved': len(serializer.validated_data)}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

---

### 1.4 URLs

Crear `runs/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('', views.RunSessionListCreateView.as_view(), name='run-list-create'),
    path('<int:pk>/', views.RunSessionDetailView.as_view(), name='run-detail'),
    path('<int:pk>/points/', views.add_run_points, name='run-add-points'),
]
```

En el `urls.py` principal del proyecto, incluir:

```python
path('api/runs/', include('runs.urls')),
```

---

### 1.5 App y migraciones

Registrar la app en `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    'runs',
]
```

Ejecutar:

```bash
python manage.py makemigrations runs
python manage.py migrate
```

---

## 2. Frontend — React Native (Expo)

### 2.1 Dependencias a instalar

```bash
npx expo install expo-location
npm install react-native-maps
npm install kalman-filter
```

> **Nota sobre `react-native-maps`:** Requiere configuración adicional en `app.json` para Google Maps (Android) y Apple Maps (iOS). Ver documentación oficial de `react-native-maps` para las API keys necesarias.

---

### 2.2 Estructura de archivos a crear

```
src/
├── screens/
│   ├── RunActiveScreen.js       # Pantalla durante la carrera
│   └── RunSummaryScreen.js      # Pantalla de resumen post-carrera
├── hooks/
│   └── useRunTracking.js        # Lógica de GPS, métricas y API calls
├── utils/
│   └── runMetrics.js            # Funciones de cálculo (haversine, pace, etc.)
└── api/
    └── runsApi.js               # Funciones de llamada a la API de Django
```

---

### 2.3 `src/utils/runMetrics.js`

```javascript
/**
 * Calcula la distancia en metros entre dos coordenadas usando la fórmula Haversine.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formatea pace en segundos/km a string "MM:SS /km".
 */
export function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm === 0) return '--:-- /km';
  const mins = Math.floor(secondsPerKm / 60);
  const secs = secondsPerKm % 60;
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

/**
 * Formatea distancia en metros a string legible.
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formatea duración en segundos a "HH:MM:SS" o "MM:SS".
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Calcula el pace actual basado en los últimos N puntos GPS.
 */
export function calculateCurrentPace(points, windowSize = 5) {
  if (points.length < 2) return 0;
  const recent = points.slice(-windowSize);
  let dist = 0;
  for (let i = 1; i < recent.length; i++) {
    dist += haversineDistance(
      recent[i - 1].latitude, recent[i - 1].longitude,
      recent[i].latitude, recent[i].longitude
    );
  }
  const timeDiff = (new Date(recent[recent.length - 1].timestamp) - new Date(recent[0].timestamp)) / 1000;
  if (dist === 0 || timeDiff === 0) return 0;
  return Math.round(timeDiff / (dist / 1000));
}
```

---

### 2.4 `src/api/runsApi.js`

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function createRunSession(startedAt) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/runs/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ started_at: startedAt, session_type: 'free' }),
  });
  return res.json();
}

export async function sendRunPoints(sessionId, points) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/runs/${sessionId}/points/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ points }),
  });
  return res.json();
}

export async function completeRunSession(sessionId, endedAt) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/runs/${sessionId}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'completed', ended_at: endedAt }),
  });
  return res.json();
}

export async function getRunSession(sessionId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/runs/${sessionId}/`, { headers });
  return res.json();
}

export async function getRunHistory() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/runs/`, { headers });
  return res.json();
}
```

---

### 2.5 `src/hooks/useRunTracking.js`

```javascript
import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { createRunSession, sendRunPoints, completeRunSession } from '../api/runsApi';
import { haversineDistance, calculateCurrentPace } from '../utils/runMetrics';

const BATCH_INTERVAL_MS = 10000;  // enviar puntos cada 10 segundos
const GPS_INTERVAL_MS = 2000;     // leer GPS cada 2 segundos
const MIN_ACCURACY_M = 20;        // descartar puntos con accuracy > 20m

export function useRunTracking() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | active | paused | completed
  const [coordinates, setCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);

  const locationSubscription = useRef(null);
  const batchBuffer = useRef([]);
  const batchTimer = useRef(null);
  const timerRef = useRef(null);
  const startTime = useRef(null);

  // Timer de duración
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const flushBatch = useCallback(async (id) => {
    if (batchBuffer.current.length === 0) return;
    const toSend = [...batchBuffer.current];
    batchBuffer.current = [];
    try {
      await sendRunPoints(id, toSend);
    } catch (e) {
      // Si falla, reinsertar para el próximo batch
      batchBuffer.current = [...toSend, ...batchBuffer.current];
    }
  }, []);

  const startRun = useCallback(async () => {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setError('Permiso de ubicación denegado.');
        return;
      }

      const now = new Date().toISOString();
      const session = await createRunSession(now);
      setSessionId(session.id);
      setStatus('active');
      startTime.current = new Date();

      // Iniciar tracking GPS
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: GPS_INTERVAL_MS,
          distanceInterval: 5,
        },
        (location) => {
          const { latitude, longitude, altitude, accuracy, speed } = location.coords;
          const timestamp = new Date(location.timestamp).toISOString();

          // Filtrar puntos con baja precisión
          if (accuracy > MIN_ACCURACY_M) return;

          const point = { lat: latitude, lng: longitude, altitude_m: altitude, accuracy_m: accuracy, timestamp, speed_m_s: speed };

          batchBuffer.current.push(point);

          setCoordinates((prev) => {
            const updated = [...prev, { latitude, longitude, timestamp }];

            // Actualizar distancia
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              const d = haversineDistance(last.latitude, last.longitude, latitude, longitude);
              setTotalDistance((dist) => dist + d);
            }

            // Actualizar pace actual
            setCurrentPace(calculateCurrentPace(updated));

            return updated;
          });
        }
      );

      // Batch timer
      batchTimer.current = setInterval(() => {
        flushBatch(session.id);
      }, BATCH_INTERVAL_MS);

    } catch (e) {
      setError('Error al iniciar la sesión de running.');
      console.error(e);
    }
  }, [flushBatch]);

  const stopRun = useCallback(async () => {
    // Detener GPS
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    clearInterval(batchTimer.current);

    // Enviar puntos pendientes
    if (sessionId) {
      await flushBatch(sessionId);
      const endedAt = new Date().toISOString();
      const completed = await completeRunSession(sessionId, endedAt);
      setStatus('completed');
      return completed; // devuelve el resumen para navegar a RunSummaryScreen
    }
  }, [sessionId, flushBatch]);

  return {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    error,
    startRun,
    stopRun,
  };
}
```

---

### 2.6 `src/screens/RunActiveScreen.js`

```javascript
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRunTracking } from '../hooks/useRunTracking';
import { formatDistance, formatDuration, formatPace } from '../utils/runMetrics';

export default function RunActiveScreen({ navigation }) {
  const { status, coordinates, totalDistance, currentPace, elapsedSeconds, error, startRun, stopRun } = useRunTracking();
  const mapRef = useRef(null);

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  // Centrar mapa en la posición actual
  useEffect(() => {
    if (coordinates.length > 0 && mapRef.current) {
      const last = coordinates[coordinates.length - 1];
      mapRef.current.animateToRegion({
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [coordinates]);

  const handleStop = async () => {
    Alert.alert('Finalizar carrera', '¿Deseas terminar esta sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          const summary = await stopRun();
          navigation.replace('RunSummary', { sessionId: summary.id });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
      >
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#FF4500"
            strokeWidth={4}
          />
        )}
      </MapView>

      <View style={styles.metricsPanel}>
        <View style={styles.metricRow}>
          <MetricCard label="Distancia" value={formatDistance(totalDistance)} />
          <MetricCard label="Tiempo" value={formatDuration(elapsedSeconds)} />
          <MetricCard label="Ritmo" value={formatPace(currentPace)} />
        </View>

        {status === 'idle' ? (
          <TouchableOpacity style={styles.startButton} onPress={startRun}>
            <Text style={styles.buttonText}>Iniciar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.buttonText}>Finalizar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MetricCard({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  metricsPanel: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricCard: { alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  metricLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  startButton: {
    backgroundColor: '#22C55E',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#EF4444',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
```

---

### 2.7 `src/screens/RunSummaryScreen.js`

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { getRunSession } from '../api/runsApi';
import { formatDistance, formatDuration, formatPace } from '../utils/runMetrics';

export default function RunSummaryScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);

  useEffect(() => {
    getRunSession(sessionId).then(setSession);
  }, [sessionId]);

  if (!session) return <View style={styles.loading}><Text style={styles.loadingText}>Calculando resultados...</Text></View>;

  const coordinates = session.points.map((p) => ({ latitude: p.lat, longitude: p.lng }));

  const initialRegion = coordinates.length > 0 ? {
    latitude: coordinates[0].latitude,
    longitude: coordinates[0].longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : null;

  return (
    <ScrollView style={styles.container}>
      {coordinates.length > 1 && initialRegion && (
        <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion} scrollEnabled={false}>
          <Polyline coordinates={coordinates} strokeColor="#FF4500" strokeWidth={4} />
        </MapView>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>Resumen de carrera</Text>

        <View style={styles.grid}>
          <SummaryCard label="Distancia" value={formatDistance(session.total_distance_m)} />
          <SummaryCard label="Tiempo" value={formatDuration(session.total_duration_s)} />
          <SummaryCard label="Ritmo promedio" value={formatPace(session.avg_pace_s_per_km)} />
          <SummaryCard label="Mejor ritmo" value={formatPace(session.best_pace_s_per_km)} />
          <SummaryCard label="Desnivel +" value={`${Math.round(session.elevation_gain_m)} m`} />
          <SummaryCard label="Calorías" value={`${Math.round(session.calories_burned)} kcal`} />
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.doneButtonText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  loadingText: { color: '#FFFFFF', fontSize: 16 },
  map: { height: 240, width: '100%' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryCard: {
    width: '48%',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  doneButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
```

---

## 3. Navegación

En el stack de navegación de React Native, agregar las pantallas:

```javascript
// En tu NavigationContainer / Stack.Navigator

<Stack.Screen
  name="RunActive"
  component={RunActiveScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="RunSummary"
  component={RunSummaryScreen}
  options={{ title: 'Resumen', headerStyle: { backgroundColor: '#0F0F1A' }, headerTintColor: '#FFFFFF' }}
/>
```

---

## 4. Permisos

### iOS — `app.json`

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Zyfit necesita tu ubicación para registrar tu carrera.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Zyfit necesita tu ubicación en segundo plano para continuar registrando tu carrera con la pantalla apagada."
      }
    }
  }
}
```

### Android — `app.json`

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

---

## 5. Variables de entorno

Crear `.env` en la raíz del proyecto React Native:

```
EXPO_PUBLIC_API_URL=https://tu-dominio.com/api
```

En desarrollo local:

```
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000/api
```

> Usar la IP local de la máquina, no `localhost`, ya que el emulador/dispositivo físico no resuelve `localhost` al servidor de desarrollo.

---

## 6. Checklist de implementación

### Backend
- [ ] Crear app `runs` en Django
- [ ] Crear `runs/models.py` con `RunSession` y `RunPoint`
- [ ] Ejecutar `makemigrations` y `migrate`
- [ ] Crear `runs/serializers.py`
- [ ] Crear `runs/views.py`
- [ ] Crear `runs/urls.py` e incluir en el router principal
- [ ] Probar endpoints con Postman o Insomnia

### Frontend
- [ ] Instalar dependencias: `expo-location`, `react-native-maps`, `kalman-filter`
- [ ] Crear `src/utils/runMetrics.js`
- [ ] Crear `src/api/runsApi.js` con la URL del backend
- [ ] Crear `src/hooks/useRunTracking.js`
- [ ] Crear `src/screens/RunActiveScreen.js`
- [ ] Crear `src/screens/RunSummaryScreen.js`
- [ ] Registrar pantallas en el navegador
- [ ] Configurar permisos en `app.json`
- [ ] Configurar `.env` con la URL del API

---

## 7. Notas para iteraciones futuras

- **Kalman Filter:** El hook `useRunTracking` actualmente no aplica suavizado. Una vez que el GPS básico funcione, integrar `kalman-filter` sobre las coordenadas antes de agregarlas al array `coordinates` para mejorar la visualización del trace en el mapa.
- **Background tracking:** El tracking con pantalla apagada requiere `expo-task-manager` y permisos adicionales. Implementar en una segunda iteración.
- **Planned Run:** El modelo `RunSession` ya tiene el campo `session_type` y la FK `plan_session` preparados. La transición a Planned Run no requerirá cambios en los modelos existentes.
- **Calorías:** El campo `calories_burned` existe pero el cálculo no está implementado. Fórmula recomendada: `MET × peso_kg × duración_h`. Requiere que el perfil de usuario incluya peso.
