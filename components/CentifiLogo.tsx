import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";

interface Props {
  size?: number;
  showName?: boolean;
  nameColor?: string;
}

// Stylized C arc mark — matches the icon.png design
function CLogoMark({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.36;
  const innerR = size * 0.22;
  const gapDeg = 58;
  const startDeg = gapDeg / 2;
  const endDeg = 360 - gapDeg / 2;

  const toRad = (d: number) => (d * Math.PI) / 180;

  // Arc path helper (SVG arc command)
  const arcPath = (r: number, from: number, to: number, sweep: 0 | 1) => {
    const fx = cx + r * Math.cos(toRad(from));
    const fy = cy - r * Math.sin(toRad(from));
    const tx = cx + r * Math.cos(toRad(to));
    const ty = cy - r * Math.sin(toRad(to));
    const large = to - from > 180 ? 1 : 0;
    return `M ${fx} ${fy} A ${r} ${r} 0 ${large} ${sweep} ${tx} ${ty}`;
  };

  // Full donut-C shape as a closed path
  const totalAng = 360 - gapDeg;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const large = totalAng > 180 ? 1 : 0;

  // Outer arc start/end
  const ox1 = cx + outerR * Math.cos(s);
  const oy1 = cy - outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e);
  const oy2 = cy - outerR * Math.sin(e);
  // Inner arc start/end (reversed)
  const ix1 = cx + innerR * Math.cos(e);
  const iy1 = cy - innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s);
  const iy2 = cy - innerR * Math.sin(s);

  const d = [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${ix2} ${iy2}`,
    "Z",
  ].join(" ");

  // Dot position — center of gap on the right
  const dotAngle = toRad(0);
  const dotR = (outerR + innerR) / 2;
  const dotX = cx + dotR * Math.cos(dotAngle) + size * 0.04;
  const dotY = cy - dotR * Math.sin(dotAngle);
  const dotSize = size * 0.07;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={d} fill="white" />
      <Circle cx={dotX} cy={dotY} r={dotSize} fill="white" />
    </Svg>
  );
}

export default function CentifiLogo({ size = 64, showName = false, nameColor = "#ffffff" }: Props) {
  const PURPLE = "#6C63FF";
  const borderRadius = size * 0.26;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: size, height: size, borderRadius,
        backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
        shadowColor: PURPLE, shadowOffset: { width: 0, height: size * 0.1 },
        shadowOpacity: 0.4, shadowRadius: size * 0.2, elevation: 12,
      }}>
        <CLogoMark size={size * 0.7} />
      </View>
      {showName && (
        <Text style={{
          color: nameColor, fontSize: size * 0.28, fontWeight: "800",
          letterSpacing: -0.5, marginTop: size * 0.18,
        }}>
          centifi
        </Text>
      )}
    </View>
  );
}
