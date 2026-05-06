package app.centifi;

/**
 * Stub BuildConfig to satisfy ReactNativeApplicationEntryPoint.java after package rename.
 *
 * The real app package is {@code centifi.app}. This class only provides the flags referenced
 * from generated autolinking code so the project can compile deterministically.
 */
public final class BuildConfig {
  private BuildConfig() {}

  // React Native 0.82+ runs with New Architecture enabled by default.
  public static final boolean IS_NEW_ARCHITECTURE_ENABLED = true;

  // Keep conservative default; app still works without edge-to-edge.
  public static final boolean IS_EDGE_TO_EDGE_ENABLED = false;
}

