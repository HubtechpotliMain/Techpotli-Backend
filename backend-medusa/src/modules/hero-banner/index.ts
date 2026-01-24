import HeroBannerService from "./service"
import { Module } from "@medusajs/framework/utils"

export const HERO_BANNER_MODULE = "heroBanner"

export default Module(HERO_BANNER_MODULE, {
  service: HeroBannerService,
})
