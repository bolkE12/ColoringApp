import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_ANIMALS_KEY = '@saved_animals';

export interface SavedAnimal {
  id: string;
  hybridKey: string;
  animalName: string;
  imageUri: string;
  timestamp: number;
}

export async function getSavedAnimals(): Promise<SavedAnimal[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(SAVED_ANIMALS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error loading saved animals:', error);
    return [];
  }
}

export async function saveAnimal(
  hybridKey: string,
  animalName: string,
  imageUri: string
): Promise<void> {
  try {
    const animals = await getSavedAnimals();
    const newAnimal: SavedAnimal = {
      id: Date.now().toString(),
      hybridKey,
      animalName,
      imageUri,
      timestamp: Date.now(),
    };
    animals.push(newAnimal);
    const jsonValue = JSON.stringify(animals);
    await AsyncStorage.setItem(SAVED_ANIMALS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving animal:', error);
    throw error;
  }
}

export async function deleteAnimal(id: string): Promise<void> {
  try {
    const animals = await getSavedAnimals();
    const filtered = animals.filter(animal => animal.id !== id);
    const jsonValue = JSON.stringify(filtered);
    await AsyncStorage.setItem(SAVED_ANIMALS_KEY, jsonValue);
  } catch (error) {
    console.error('Error deleting animal:', error);
    throw error;
  }
}

export async function clearAllAnimals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_ANIMALS_KEY);
  } catch (error) {
    console.error('Error clearing animals:', error);
    throw error;
  }
}
