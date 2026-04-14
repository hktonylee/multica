package main

import "testing"

func TestValidateSecurityConfig(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", "")

	if err := validateSecurityConfig(); err == nil {
		t.Fatal("expected error when JWT_SECRET is missing in production")
	}
}

func TestValidateSecurityConfigAllowsMissingSecretInDev(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("JWT_SECRET", "")

	if err := validateSecurityConfig(); err != nil {
		t.Fatalf("expected no error in development, got %v", err)
	}
}

func TestValidateSecurityConfigAllowsConfiguredSecret(t *testing.T) {
	t.Setenv("APP_ENV", "staging")
	t.Setenv("JWT_SECRET", "test-secret")

	if err := validateSecurityConfig(); err != nil {
		t.Fatalf("expected no error when JWT_SECRET is set, got %v", err)
	}
}
