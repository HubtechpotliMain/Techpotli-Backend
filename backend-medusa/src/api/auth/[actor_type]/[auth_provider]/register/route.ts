import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { generateJwtToken } from "@medusajs/utils"
import { acceptInviteWorkflow } from "@medusajs/core-flows"

/**
 * Custom POST /auth/:actor_type/:auth_provider/register
 * When body contains invite_token, we validate the token, create auth identity,
 * run accept-invite workflow, and return a JWT so the admin dashboard can complete the flow.
 * This fixes 401 on invite acceptance when the default emailpass register path fails.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { actor_type, auth_provider } = req.params
  const body = (req.body ?? {}) as Record<string, unknown>
  const inviteToken = typeof body.invite_token === "string" ? body.invite_token : null

  if (!inviteToken || actor_type !== "user" || auth_provider !== "emailpass") {
    return runDefaultRegister(req, res)
  }

  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email || !password) {
    return res.status(401).json({
      message: "Email and password are required when accepting an invite.",
    })
  }

  const scope = req.scope
  const userModule = scope.resolve(Modules.USER) as {
    validateInviteToken: (token: string) => Promise<{ email: string; id: string }>
  }
  const authModule = scope.resolve(Modules.AUTH) as {
    createAuthIdentities: (data: {
      provider_identities: Array<{
        entity_id: string
        provider: string
        provider_metadata?: Record<string, unknown>
      }>
    }[]) => Promise<Array<{ id: string; provider_identities?: Array<{ provider: string }> }>>
  }

  let invite: { email: string; id: string }
  try {
    invite = await userModule.validateInviteToken(inviteToken)
  } catch {
    return res.status(401).json({ message: "Invalid or expired invite token." })
  }

  const config = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string; jwtExpiresIn?: string; jwtOptions?: Record<string, unknown> } }
  }
  const httpConfig = config?.projectConfig?.http
  if (!httpConfig?.jwtSecret) {
    return res.status(500).json({ message: "Server configuration error." })
  }

  let passwordHash: string
  try {
    const provider = scope.resolve("au_emailpass") as { hashPassword: (password: string) => Promise<string> }
    passwordHash = await provider.hashPassword(password)
  } catch (e) {
    return res.status(500).json({ message: "Server configuration error." })
  }

  const [createdAuthIdentity] = await authModule.createAuthIdentities([
    {
      provider_identities: [
        {
          entity_id: email,
          provider: "emailpass",
          provider_metadata: { password: passwordHash },
        },
      ],
    },
  ])
  const authIdentityId = createdAuthIdentity?.id
  if (!authIdentityId) {
    return res.status(500).json({ message: "Failed to create auth identity." })
  }

  const userData = {
    email: email || invite.email,
    first_name: (typeof body.first_name === "string" ? body.first_name : undefined) ?? undefined,
    last_name: (typeof body.last_name === "string" ? body.last_name : undefined) ?? undefined,
  }

  let createdUser: { id: string }
  try {
    const { result: users } = await acceptInviteWorkflow(scope).run({
      input: {
        invite_token: inviteToken,
        auth_identity_id: authIdentityId,
        user: userData,
      },
    })
    createdUser = users?.[0]
    if (!createdUser?.id) {
      return res.status(500).json({ message: "Failed to create user." })
    }
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired invite token." })
  }

  const tokenPayload = {
    actor_id: createdUser.id,
    actor_type: "user",
    auth_identity_id: authIdentityId,
    app_metadata: { user_id: createdUser.id },
    user_metadata: {},
  }
  const token = generateJwtToken(tokenPayload, {
    secret: httpConfig.jwtSecret,
    expiresIn: httpConfig.jwtExpiresIn ?? (httpConfig.jwtOptions as { expiresIn?: string })?.expiresIn ?? "7d",
    jwtOptions: httpConfig.jwtOptions ?? {},
  })

  return res.status(200).json({ token })
}

async function runDefaultRegister(req: MedusaRequest, res: MedusaResponse) {
  const { actor_type, auth_provider } = req.params
  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string; jwtExpiresIn?: string; jwtOptions?: Record<string, unknown> } }
  }
  const authService = req.scope.resolve(Modules.AUTH) as {
    register: (provider: string, authData: { body: unknown }) => Promise<{ success: boolean; error?: string; authIdentity?: unknown }>
  }
  const authData = {
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    protocol: req.protocol,
  }
  const { success, error, authIdentity } = await authService.register(auth_provider, authData)
  if (success && authIdentity) {
    const identity = authIdentity as {
      id?: string
      app_metadata?: Record<string, unknown>
      provider_identities?: Array<{ provider: string; user_metadata?: Record<string, unknown> }>
    }
    const entityIdKey = `${actor_type}_id`
    const entityId = (identity?.app_metadata?.[entityIdKey] as string) ?? ""
    const providerIdentity = auth_provider
      ? identity?.provider_identities?.find((pi) => pi.provider === auth_provider)
      : undefined
    const tokenPayload = {
      actor_id: entityId,
      actor_type: actor_type,
      auth_identity_id: identity?.id ?? "",
      app_metadata: { [entityIdKey]: entityId },
      user_metadata: providerIdentity?.user_metadata ?? {},
    }
    const token = generateJwtToken(tokenPayload, {
      secret: config.projectConfig.http.jwtSecret,
      expiresIn: config.projectConfig.http.jwtExpiresIn ?? (config.projectConfig.http.jwtOptions as { expiresIn?: string })?.expiresIn ?? "7d",
      jwtOptions: config.projectConfig.http.jwtOptions ?? {},
    })
    return res.status(200).json({ token })
  }
  return res.status(401).json({
    message: error ?? "Authentication failed",
  })
}
