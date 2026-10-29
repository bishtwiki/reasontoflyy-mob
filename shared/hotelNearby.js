"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotelRadii = void 0;
exports.distanceLabel = distanceLabel;
exports.distanceMeters = distanceMeters;
exports.hotelRadii = [200, 500, 1000, 2000, 5000, 10000];
function distanceLabel(metres) { return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres % 1000 ? 1 : 0)} km`; }
function distanceMeters(a, b) { const rad = (n) => n * Math.PI / 180; const dlat = rad(b.latitude - a.latitude), dlon = rad(b.longitude - a.longitude); const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2; return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h))); }
