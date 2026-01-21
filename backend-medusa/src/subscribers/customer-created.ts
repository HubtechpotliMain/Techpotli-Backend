import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import EmailVerificationServiceImpl from "../services/email-verification"
import { generateVerificationToken } from "../utils/verification-token"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  try {
    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer) {
      logger.warn(`Customer ${data.id} not found after creation`)
      return
    }

    // Check if customer already has email_verified set
    const emailVerified = customer.metadata?.email_verified as boolean | undefined

    // Only send verification email if not already verified
    if (emailVerified !== true) {
      // Generate verification token
      const token = generateVerificationToken(customer.id, customer.email)

      // Update metadata with verification status and token
      const updatedMetadata = {
        ...(customer.metadata || {}),
        email_verified: false,
        verification_token: token,
        verification_token_created_at: Date.now().toString(),
      }

      // IMPORTANT: updateCustomers signature is (id, data) / (selector, data)
      await customerModuleService.updateCustomers(customer.id, {
        metadata: updatedMetadata,
      })

      // Send verification email
      try {
        const emailService = new EmailVerificationServiceImpl()
        await emailService.sendVerificationEmail({
          email: customer.email,
          token,
          firstName: customer.first_name || undefined,
        })

        logger.info(`Verification email sent to ${customer.email}`)
      } catch (emailError) {
        logger.error(`Failed to send verification email to ${customer.email}:`, emailError)
        // Don't throw - customer creation should succeed even if email fails
      }
    } else {
      logger.info(`Customer ${customer.email} already verified, skipping verification email`)
    }
  } catch (error) {
    logger.error(`Failed to handle customer creation for ${data.id}:`, error)
    // Don't throw - we don't want to block customer creation if email fails
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
