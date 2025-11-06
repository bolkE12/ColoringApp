import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  FlatList,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import { getSavedAnimals, deleteAnimal, SavedAnimal } from "../src/utils/savedAnimals";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_SIZE = (SCREEN_WIDTH - 64) / 3; // 3 columns with padding

export default function PenScreen() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({ MadimiOne_400Regular });
  const [savedAnimals, setSavedAnimals] = useState<SavedAnimal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnimals = async () => {
    try {
      const animals = await getSavedAnimals();
      // Sort by newest first
      animals.sort((a, b) => b.timestamp - a.timestamp);
      setSavedAnimals(animals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload animals when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAnimals();
    }, [])
  );

  const handleDelete = (animal: SavedAnimal) => {
    Alert.alert(
      "Delete Animal",
      `Are you sure you want to delete this ${animal.animalName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAnimal(animal.id);
              await loadAnimals();
            } catch (error) {
              console.error("Error deleting animal:", error);
              Alert.alert("Error", "Failed to delete animal");
            }
          },
        },
      ]
    );
  };

  const renderAnimal = ({ item }: { item: SavedAnimal }) => (
    <View style={styles.gridItem}>
      <Pressable
        style={styles.imageContainer}
        onLongPress={() => handleDelete(item)}
      >
        <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
        <Pressable
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Trash2 size={16} color="#fff" />
        </Pressable>
      </Pressable>
      <Text style={styles.animalName} numberOfLines={1}>
        {item.animalName}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No saved animals yet!</Text>
      <Text style={styles.emptySubtext}>
        Color some animals and save them to see them here.
      </Text>
    </View>
  );

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      resizeMode="cover"
      style={styles.bg}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft color="#111" size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.screenTitle}>My Animal Pen</Text>
          <View style={{ width: 72 }} />{/* spacer */}
        </View>

        {/* Gallery */}
        <View style={styles.container}>
          <FlatList
            data={savedAnimals}
            renderItem={renderAnimal}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={loading ? null : renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#4CA0E8",
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 16,
  },
  screenTitle: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 28,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  grid: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  gridItem: {
    width: ITEM_SIZE,
    marginBottom: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  imageContainer: {
    width: ITEM_SIZE - 8,
    height: ITEM_SIZE - 8,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  animalName: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 24,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  emptySubtext: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.9,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
