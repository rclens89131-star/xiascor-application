          <Text style={{ color: "#D1D5DB", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {xsGetClubNameV1(c)}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            right: 8,
            bottom: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: scoreCircleSize,
              height: scoreCircleSize,
              borderRadius: 999,
              borderWidth: 4,
              borderColor: scoreTone.main,
              backgroundColor: "rgba(0,0,0,0.72)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: scoreTone.main,
              shadowOpacity: 0.38,
              shadowRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: Math.round(scoreCircleSize * 0.39), lineHeight: Math.round(scoreCircleSize * 0.44) }}>
              {l5Avg === null ? "—" : l5Avg}
            </Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 10, marginTop: 2 }}>L5</Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)", paddingHorizontal: 10, paddingVertical: 9 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "#C7CBD1", fontSize: 10, fontWeight: "900" }} numberOfLines={1}>
              L5
            </Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
              {Array.from({ length: 5 }, (_, i) => {
                const score = l5Scores[i];
                const tone = xsScoreColorV1(score);
                return (
                  <View
                    key={`l5-${i}`}
                    style={{
                      width: scoreBoxSize,
                      height: scoreBoxSize,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: score == null ? "#1F2937" : tone.main,
                    }}
                  >
                    <Text style={{ color: score != null && score >= 75 ? "#FFFFFF" : "#050607", fontSize: 12, fontWeight: "900" }}>
                      {score == null ? "—" : Math.round(score)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (!props?.onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={props.onPress} style={{ width }}>
      {content}
    </TouchableOpacity>
  );
}



