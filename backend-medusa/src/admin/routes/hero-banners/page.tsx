import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Table,
  Badge,
  Switch,
  IconButton,
  Input,
  Skeleton,
} from "@medusajs/ui"
import { useEffect, useState, useCallback } from "react"
import { Photo, PencilSquare, Trash, Plus, ArrowUpMini, ArrowDownMini } from "@medusajs/icons"

/**
 * Hero Banners Admin Page
 * Full CRUD interface for managing hero banners
 */
const HeroBannersPage = () => {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    redirect_url: "",
    is_active: true,
    sort_order: 0,
  })

  const fetchBanners = useCallback(async () => {
    try {
      const response = await fetch("/admin/hero-banners")
      const data = await response.json()
      setBanners(data.banners || [])
    } catch (error) {
      console.error("Failed to fetch banners:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  // Refetch when tab gains focus (e.g. another tab updated banners)
  useEffect(() => {
    const onFocus = () => {
      setLoading(false)
      fetchBanners()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchBanners])

  const handleImageUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/admin/hero-banners/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "Upload failed")
      throw new Error(message)
    }

    const data = await response.json()
    return data.url as string
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const url = await handleImageUpload(file)
      setFormData({ ...formData, image_url: url })
    } catch {
      alert("Failed to upload image")
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      image_url: "",
      redirect_url: "",
      is_active: true,
      sort_order: 0,
    })
    setEditingBanner(null)
  }

  const handleCreate = async () => {
    if (!formData.image_url) {
      alert("Image URL is required")
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticBanner = {
      id: tempId,
      title: formData.title || null,
      image_url: formData.image_url,
      redirect_url: formData.redirect_url || null,
      is_active: formData.is_active,
      sort_order: banners.length,
    }
    setBanners((prev) => [...prev, optimisticBanner])
    resetForm()
    setShowForm(false)

    try {
      const response = await fetch("/admin/hero-banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setBanners((prev) =>
          prev.map((b) => (b.id === tempId ? data.banner : b))
        )
      } else {
        setBanners((prev) => prev.filter((b) => b.id !== tempId))
        try {
          const error = await response.json()
          alert(`Failed to create banner: ${error.message || "Unknown error"}`)
        } catch {
          alert(`Failed to create banner: ${response.statusText}`)
        }
      }
    } catch {
      setBanners((prev) => prev.filter((b) => b.id !== tempId))
      alert("Failed to create banner")
    }
  }

  const handleUpdate = async () => {
    if (!editingBanner) return

    const previousBanners = [...banners]
    const updated = {
      ...editingBanner,
      title: formData.title || null,
      image_url: formData.image_url,
      redirect_url: formData.redirect_url || null,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    }
    setBanners((prev) =>
      prev.map((b) => (b.id === editingBanner.id ? updated : b))
    )
    resetForm()
    setEditingBanner(null)
    setShowForm(false)

    try {
      const response = await fetch(`/admin/hero-banners/${editingBanner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setBanners((prev) =>
          prev.map((b) => (b.id === editingBanner.id ? data.banner : b))
        )
      } else {
        setBanners(previousBanners)
        try {
          const error = await response.json()
          alert(`Failed to update banner: ${error.message || "Unknown error"}`)
        } catch {
          alert(`Failed to update banner: ${response.statusText}`)
        }
      }
    } catch {
      setBanners(previousBanners)
      alert("Failed to update banner")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return

    const previousBanners = [...banners]
    setBanners((prev) => prev.filter((b) => b.id !== id))

    try {
      const response = await fetch(`/admin/hero-banners/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // already removed
      } else {
        setBanners(previousBanners)
        try {
          const error = await response.json()
          alert(`Failed to delete banner: ${error.message || "Unknown error"}`)
        } catch {
          alert(`Failed to delete banner: ${response.statusText}`)
        }
      }
    } catch {
      setBanners(previousBanners)
      alert("Failed to delete banner")
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    const previousBanners = [...banners]
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: nextStatus } : b))
    )

    try {
      const response = await fetch(`/admin/hero-banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? data.banner : b))
        )
      } else {
        setBanners(previousBanners)
        try {
          const error = await response.json()
          alert(`Failed to toggle banner status: ${error.message || "Unknown error"}`)
        } catch {
          alert(`Failed to toggle banner status: ${response.statusText}`)
        }
      }
    } catch {
      setBanners(previousBanners)
      alert("Failed to toggle banner status")
    }
  }

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((b) => b.id === id)
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === banners.length - 1)
    ) {
      return
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    const newBanners = [...banners]
    const [moved] = newBanners.splice(currentIndex, 1)
    newBanners.splice(newIndex, 0, moved)
    const reordered = newBanners.map((b, i) => ({ ...b, sort_order: i }))
    const previousBanners = [...banners]
    setBanners(reordered)

    const orders = newBanners.map((banner, index) => ({
      id: banner.id,
      sort_order: index,
    }))

    try {
      const response = await fetch("/admin/hero-banners/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      })

      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners || reordered)
      } else {
        setBanners(previousBanners)
        try {
          const error = await response.json()
          alert(`Failed to reorder banners: ${error.message || "Unknown error"}`)
        } catch {
          alert(`Failed to reorder banners: ${response.statusText}`)
        }
      }
    } catch {
      setBanners(previousBanners)
      alert("Failed to reorder banners")
    }
  }

  const handleEdit = (banner: any) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title || "",
      image_url: banner.image_url || "",
      redirect_url: banner.redirect_url || "",
      is_active: banner.is_active ?? true,
      sort_order: banner.sort_order || 0,
    })
    setShowForm(true)
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Image</Table.HeaderCell>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Redirect URL</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[1, 2, 3, 4, 5].map((i) => (
              <Table.Row key={i}>
                <Table.Cell>
                  <Skeleton className="w-20 h-12 rounded" />
                </Table.Cell>
                <Table.Cell><Skeleton className="h-4 w-24" /></Table.Cell>
                <Table.Cell><Skeleton className="h-4 w-32" /></Table.Cell>
                <Table.Cell><Skeleton className="h-5 w-14" /></Table.Cell>
                <Table.Cell><Skeleton className="h-8 w-20" /></Table.Cell>
                <Table.Cell><Skeleton className="h-8 w-24" /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading>Hero Banners</Heading>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus /> Create Banner
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border rounded-lg bg-ui-bg-base">
          <Heading level="h2" className="mb-4">
            {editingBanner ? "Edit Banner" : "Create Banner"}
          </Heading>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Banner title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Image</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} className="mb-2" />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="max-w-xs h-32 object-cover rounded"
                  />
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Or enter image URL"
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Redirect URL (optional)</label>
              <Input
                value={formData.redirect_url}
                onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                placeholder="/categories/electronics"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <span>Active</span>
              </label>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={editingBanner ? handleUpdate : handleCreate}>
                {editingBanner ? "Update" : "Create"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Image</Table.HeaderCell>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>Redirect URL</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {banners.length === 0 ? (
            <Table.Row>
              {/* @ts-expect-error Table.Cell accepts colSpan for empty state row */}
              <Table.Cell colSpan={6} className="text-center py-8">
                No banners found. Create your first banner!
              </Table.Cell>
            </Table.Row>
          ) : (
            banners.map((banner, index) => (
              <Table.Row key={banner.id}>
                <Table.Cell>
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title || "Hero banner"}
                      className="w-20 h-12 object-cover rounded"
                    />
                  ) : (
                    <span className="text-ui-fg-muted">No image</span>
                  )}
                </Table.Cell>
                <Table.Cell>{banner.title || <span className="text-ui-fg-muted">—</span>}</Table.Cell>
                <Table.Cell>
                  {banner.redirect_url || <span className="text-ui-fg-muted">—</span>}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={banner.is_active ? "green" : "grey"}>
                    {banner.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="transparent"
                      onClick={() => handleReorder(banner.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUpMini />
                    </IconButton>
                    <span>{banner.sort_order}</span>
                    <IconButton
                      variant="transparent"
                      onClick={() => handleReorder(banner.id, "down")}
                      disabled={index === banners.length - 1}
                    >
                      <ArrowDownMini />
                    </IconButton>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="transparent"
                      onClick={() => handleToggleActive(banner.id, banner.is_active)}
                      title="Toggle active"
                    >
                      <Switch checked={banner.is_active} />
                    </IconButton>
                    <IconButton variant="transparent" onClick={() => handleEdit(banner)} title="Edit">
                      <PencilSquare />
                    </IconButton>
                    <IconButton
                      variant="transparent"
                      onClick={() => handleDelete(banner.id)}
                      title="Delete"
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Hero Banners",
  icon: Photo,
  rank: 30,
})

export default HeroBannersPage

