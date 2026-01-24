import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RazorpayProviderService from "./service"

const services = [RazorpayProviderService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
