"use client"

import { Image, type ImageProps, type ImageSourcePropType, StyleSheet } from "react-native"

const LOGO_DEFAULT = require("../logo.png")

type BrandLogoProps = {
  size?: number
  style?: ImageProps["style"]
  /** Tuỳ chọn — mặc định `logo.png` (splash/icon). VD đăng nhập: `require("../logo-app.png")` */
  source?: ImageSourcePropType
}

/** Logo brand cho màn trong app — mặc định trùng file icon/splash; có thể truyền `source` riêng. */
export default function BrandLogo({ size = 56, style, source = LOGO_DEFAULT }: BrandLogoProps) {
  return (
    <Image
      source={source}
      style={[styles.base, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Logo Viviene Delivery"
      accessibilityIgnoresInvertColors
    />
  )
}

const styles = StyleSheet.create({
  base: {},
})
