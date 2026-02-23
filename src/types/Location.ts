/**
 * Location entity types for GPS location tracking functionality
 *
 * @module types/Location
 */

/**
 * LocationRecord entity representing a GPS location record stored in the database
 */
export interface LocationRecord {
  /** Unique identifier */
  id: number;
  /** Latitude coordinate (-90 to 90) */
  latitude: number;
  /** Longitude coordinate (-180 to 180) */
  longitude: number;
  /** GPS accuracy in meters */
  accuracy?: number;
  /** Altitude in meters */
  altitude?: number;
  /** Heading/bearing in degrees (0-360) */
  heading?: number;
  /** Speed in meters per second */
  speed?: number;
  /** ISO 8601 timestamp when location was recorded */
  created_at: string;
}

/**
 * Input type for creating a new location record
 */
export interface CreateLocationInput {
  /** Latitude coordinate (-90 to 90) */
  latitude: number;
  /** Longitude coordinate (-180 to 180) */
  longitude: number;
  /** GPS accuracy in meters */
  accuracy?: number;
  /** Altitude in meters */
  altitude?: number;
  /** Heading/bearing in degrees (0-360) */
  heading?: number;
  /** Speed in meters per second */
  speed?: number;
}
