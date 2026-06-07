import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  color?: string;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  color = "#F5A623",
  interactive = false,
  onRate,
}: StarRatingProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        const star = (
          <Feather
            key={i}
            name={filled ? "star" : "star"}
            size={size}
            color={filled ? color : "#D1D5DB"}
            style={{ opacity: filled ? 1 : 0.5 }}
          />
        );
        if (interactive) {
          return (
            <TouchableOpacity key={i} onPress={() => onRate?.(i + 1)} activeOpacity={0.7}>
              {star}
            </TouchableOpacity>
          );
        }
        return star;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
