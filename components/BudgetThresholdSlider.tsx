import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, PanResponder, StyleSheet, type LayoutChangeEvent } from "react-native";

const CORAL = "#FF6B6B";

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  isDark: boolean;
};

export function BudgetThresholdSlider({
  value,
  onChange,
  min = 50,
  max = 100,
  isDark,
}: Props) {
  const [trackW, setTrackW] = useState(0);
  const padRef = useRef<View>(null);
  /** Left edge of slider on screen — used with pageX when locationX is unreliable. */
  const padLeftRef = useRef(0);

  const clampValue = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  );

  const valueFromXInTrack = useCallback(
    (xInTrack: number, width: number) => {
      const w = width;
      if (w <= 0) return clampValue(value);
      const p = Math.min(1, Math.max(0, xInTrack / w));
      return clampValue(Math.round(min + p * (max - min)));
    },
    [clampValue, min, max, value],
  );

  const applyTouch = useCallback(
    (native: { locationX: number; pageX: number }) => {
      const w = trackW;
      if (w <= 0) return;
      let x = native.locationX;
      const left = padLeftRef.current;
      if (left > 0 && Number.isFinite(native.pageX)) {
        const fromPage = native.pageX - left;
        if (Math.abs(fromPage - x) > 1) {
          x = fromPage;
        }
      }
      onChange(valueFromXInTrack(x, w));
    },
    [onChange, trackW, valueFromXInTrack],
  );

  const syncPadLeft = useCallback(() => {
    padRef.current?.measureInWindow((x) => {
      padLeftRef.current = x;
    });
  }, []);

  const onLayoutPad = useCallback(
    (e: LayoutChangeEvent) => {
      setTrackW(e.nativeEvent.layout.width);
      requestAnimationFrame(syncPadLeft);
    },
    [syncPadLeft],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          syncPadLeft();
          applyTouch(e.nativeEvent);
        },
        onPanResponderMove: (e) => {
          applyTouch(e.nativeEvent);
        },
      }),
    [applyTouch, syncPadLeft],
  );

  const v = clampValue(value);
  const ratio = (v - min) / (max - min);
  const unfilled = isDark ? "#3a3a3c" : "#d1d1d6";
  const thumbLeft = trackW > 0 ? ratio * trackW - 10 : 0;
  const thumbClamped = trackW > 0 ? Math.max(0, Math.min(thumbLeft, trackW - 20)) : 0;

  return (
    <View
      ref={padRef}
      style={styles.touchPad}
      onLayout={onLayoutPad}
      collapsable={false}
      {...pan.panHandlers}
    >
      {/* Hits must land on the pad so locationX is along the full track (not the thumb). */}
      <View style={[styles.track, { backgroundColor: unfilled }]} pointerEvents="none">
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${ratio * 100}%`,
            backgroundColor: CORAL,
            borderRadius: 6,
          }}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbClamped,
              borderColor: isDark ? "#1c1c1e" : "#fff",
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touchPad: {
    height: 44,
    justifyContent: "center",
    marginVertical: 4,
  },
  track: {
    height: 8,
    borderRadius: 6,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  thumb: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});
