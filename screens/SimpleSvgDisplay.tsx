import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { loadHybridXml } from "../src/utils/assetLoader.native";

type Props = {
  hybridKey: string;
  width?: number | string;
  height?: number | string;
};

export default function SimpleSvgDisplay({ hybridKey, width = "100%", height = "100%" }: Props) {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSvg() {
      try {
        setLoading(true);
        setError(null);
        console.log("[SimpleSvgDisplay] Loading hybrid:", hybridKey);

        const xml = await loadHybridXml(hybridKey);

        if (!cancelled) {
          console.log("[SimpleSvgDisplay] SVG loaded successfully, length:", xml.length);
          setSvgXml(xml);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[SimpleSvgDisplay] Error loading SVG:", err);
          setError(err instanceof Error ? err.message : "Failed to load SVG");
          setLoading(false);
        }
      }
    }

    loadSvg();

    return () => {
      cancelled = true;
    };
  }, [hybridKey]);

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#A133F5" />
        <Text style={styles.loadingText}>Loading your animal...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>Failed to load animal</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!svgXml) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>No SVG data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <SvgXml
        xml={svgXml}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "MadimiOne_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontFamily: "MadimiOne_400Regular",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
