# ------------------------------------------------------------------------------
# Docker Bake configuration for Bakong Notification Services Monorepo
# Builds both backend and frontend Docker images.
# This file works with GitHub Actions + bakong-workflows/docker-image-multistage.yml
# ------------------------------------------------------------------------------

# -------------------------------
# Variables (can be overridden)
# -------------------------------
variable "DOCKER_REGISTRY" {
  default = "harbor.sorakh.io"
}

variable "DOCKER_NAMESPACE" {
  default = "/project-bakong"
}

variable "VERSION" {
  # Fallback tag (can be overridden by GitHub Actions "set:" parameters)
  default = "latest"
}

# -------------------------------
# Default build group
# -------------------------------
group "default" {
  targets = ["backend", "frontend"]
}

# -------------------------------
# Backend target
# -------------------------------
target "backend" {
  dockerfile = "apps/backend/Dockerfile"
  context    = "."
  
  # 👇 Tags are dynamically overridden by GitHub Actions “set” parameters
  tags = [
    "${DOCKER_REGISTRY}${DOCKER_NAMESPACE}/notification-services-backend:${VERSION}"
  ]

  # ✅ “type=docker” allows local builds (and works with --push)
  output = ["type=docker"]
}

# -------------------------------
# Frontend target
# -------------------------------
target "frontend" {
  dockerfile = "apps/frontend/Dockerfile"
  context    = "."
  
  tags = [
    "${DOCKER_REGISTRY}${DOCKER_NAMESPACE}/notification-services-frontend:${VERSION}"
  ]

  output = ["type=docker"]
}
