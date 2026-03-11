export interface ObstacleDetectionResult {
  obstacleAreaM2: number;
}

// Stub obstacle detection: in a real implementation we would use a model.
export async function detectObstaclesM2(_imagePath: string): Promise<ObstacleDetectionResult> {
  return {
    obstacleAreaM2: 10, // pretend we found 10 m² of obstacles
  };
}

