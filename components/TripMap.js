"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

const DEFAULT_CENTER = [30, 15];

function hasCoordinates(activity) {
  if (activity.latitude == null || activity.longitude == null) return false;
  const latitude = Number(activity.latitude);
  const longitude = Number(activity.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function FitRoute({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(points, { padding: [34, 34], maxZoom: 15, animate: true });
  }, [map, points]);

  return null;
}

function markerIcon(index, status) {
  return L.divIcon({
    className: "wayfare-map-marker-shell",
    html: `<span class="wayfare-map-marker marker-${status}"><b>${index + 1}</b></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  });
}

function routeUrl(stops) {
  const location = (activity) => `${Number(activity.latitude)},${Number(activity.longitude)}`;
  if (!stops.length) return "";
  if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location(stops[0]))}`;
  const params = new URLSearchParams({
    api: "1",
    origin: location(stops[0]),
    destination: location(stops[stops.length - 1]),
    travelmode: "walking",
  });
  const waypoints = stops.slice(1, -1).slice(0, 8).map(location);
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

export default function TripMap({ activities, selectedDay, statusFor, onActivitySelect }) {
  const stops = useMemo(() => activities
    .filter((activity) => selectedDay === "All days" || (activity.day_label || "Day 1") === selectedDay)
    .filter(hasCoordinates)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)), [activities, selectedDay]);
  const points = useMemo(() => stops.map((activity) => [Number(activity.latitude), Number(activity.longitude)]), [stops]);
  const missingCount = activities.filter((activity) => (selectedDay === "All days" || (activity.day_label || "Day 1") === selectedDay) && activity.location && !hasCoordinates(activity)).length;

  if (!stops.length) {
    return (
      <div className="map-empty-state">
        <span aria-hidden="true">⌖</span>
        <strong>No mapped stops yet</strong>
        <p>Choose an exact location on an activity and it will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="trip-map-layout">
      <div className="trip-map-canvas" aria-label={`${selectedDay} itinerary map`}>
        <MapContainer center={points[0] || DEFAULT_CENTER} zoom={13} scrollWheelZoom={false} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitRoute points={points} />
          {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#1f6f63", weight: 4, opacity: 0.78, dashArray: "8 9" }} />}
          {stops.map((activity, index) => {
            const status = statusFor(activity.id);
            return (
              <Marker key={activity.id} position={points[index]} icon={markerIcon(index, status)}>
                <Popup>
                  <div className="map-popup">
                    <small>{activity.day_label || "Unscheduled"}{activity.time_text ? ` · ${activity.time_text}` : ""}</small>
                    <strong>{activity.name}</strong>
                    <span>{activity.location}</span>
                    <button type="button" onClick={() => onActivitySelect(activity.id)}>View activity</button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="map-route-panel">
        <div className="map-route-heading">
          <div><span className="eyebrow">Visual route</span><strong>{stops.length} mapped stop{stops.length === 1 ? "" : "s"}</strong></div>
          <a href={routeUrl(stops)} target="_blank" rel="noreferrer">Open route ↗</a>
        </div>
        <div className="map-stop-list">
          {stops.map((activity, index) => (
            <button type="button" key={activity.id} onClick={() => onActivitySelect(activity.id)}>
              <span className={`map-stop-number marker-${statusFor(activity.id)}`}>{index + 1}</span>
              <span><strong>{activity.name}</strong><small>{activity.time_text || "Flexible time"} · {activity.location}</small></span>
            </button>
          ))}
        </div>
        {missingCount > 0 && <p className="map-sync-note">Finding coordinates for {missingCount} saved location{missingCount === 1 ? "" : "s"}…</p>}
      </div>
    </div>
  );
}
