import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommunityEditorPage from './CommunityEditorPage.vue'

const {
  createCommunityPost,
  fetchCommunityPost,
  updateCommunityPost,
  uploadCommunityImage,
} = vi.hoisted(() => ({
  createCommunityPost: vi.fn(),
  fetchCommunityPost: vi.fn(),
  updateCommunityPost: vi.fn(),
  uploadCommunityImage: vi.fn(),
}))

vi.mock('@/entities/community/api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/community/api/communityApi')>()
  return {
    ...actual,
    createCommunityPost,
    fetchCommunityPost,
    updateCommunityPost,
    uploadCommunityImage,
  }
})

vi.mock('@/entities/place/api/placeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/place/api/placeApi')>()
  return {
    ...actual,
    fetchPlaces: vi.fn().mockResolvedValue({ content: [], totalElements: 0, page: 0, size: 8, hasNext: false }),
  }
})

describe('CommunityEditorPage cells', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uploadCommunityImage.mockResolvedValue({ imageUrl: 'https://example.com/cell.jpg' })
    createCommunityPost.mockResolvedValue({ postId: 7 })
  })

  it('creates a post with ordered text and image cells', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="community-title-input"]').setValue('Cell trip')
    await wrapper.get('[data-testid="community-cell-text-0"]').setValue('First story')
    await wrapper.get('[data-testid="cell-align-center-0"]').trigger('click')
    await wrapper.get('[data-testid="insert-image-cell-after-0"]').trigger('click')
    const file = new File(['image'], 'trip.jpg', { type: 'image/jpeg' })
    const imageInput = wrapper.get('[data-testid="community-cell-image-1"]').element as HTMLInputElement
    Object.defineProperty(imageInput, 'files', { value: [file] })
    await wrapper.get('[data-testid="community-cell-image-1"]').trigger('change')
    await wrapper.get('[data-testid="cell-align-right-1"]').trigger('click')
    await wrapper.get('[data-testid="submit-community-post"]').trigger('click')
    await flushPromises()

    expect(uploadCommunityImage).toHaveBeenCalledWith('token', file)
    expect(createCommunityPost).toHaveBeenCalledWith('token', expect.objectContaining({
      title: 'Cell trip',
      content: 'First story',
      imageUrl: 'https://example.com/cell.jpg',
      cells: [
        { cellType: 'TEXT', textContent: 'First story', imageUrl: null, alignment: 'CENTER', fontSizePx: 14, bold: false },
        { cellType: 'IMAGE', textContent: null, imageUrl: 'https://example.com/cell.jpg', alignment: 'RIGHT', fontSizePx: 0, bold: false },
      ],
    }))
  })

  it('previews text and image cells using the selected alignment', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="cell-align-center-0"]').trigger('click')
    expect(wrapper.get('[data-testid="community-cell-text-0"]').classes()).toContain('text-center')

    await wrapper.get('[data-testid="insert-image-cell-after-0"]').trigger('click')
    const file = new File(['image'], 'aligned.jpg', { type: 'image/jpeg' })
    const input = wrapper.get('[data-testid="community-cell-image-1"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    await wrapper.get('[data-testid="community-cell-image-1"]').trigger('change')
    await wrapper.get('[data-testid="cell-align-right-1"]').trigger('click')

    expect(wrapper.get('img[alt="셀 이미지 미리보기"]').element.parentElement?.classList.contains('justify-end')).toBe(true)
  })

  it('creates text cells with selected font size and bold style', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="community-title-input"]').setValue('Styled story')
    await wrapper.get('[data-testid="community-cell-text-0"]').setValue('Big bold moment')
    await wrapper.get('[data-testid="cell-font-size-0"]').setValue('32')
    await wrapper.get('[data-testid="cell-bold-0"]').trigger('click')
    await wrapper.get('[data-testid="submit-community-post"]').trigger('click')
    await flushPromises()

    const textInput = wrapper.get('[data-testid="community-cell-text-0"]')
    expect(textInput.attributes('style')).toContain('font-size: 32px')
    expect(textInput.classes()).toContain('font-bold')
    expect(createCommunityPost).toHaveBeenCalledWith('token', expect.objectContaining({
      cells: [
        { cellType: 'TEXT', textContent: 'Big bold moment', imageUrl: null, alignment: 'LEFT', fontSizePx: 32, bold: true },
      ],
    }))
  })

  it('inserts a new text cell directly after the current cell', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="community-cell-text-0"]').setValue('First')
    await wrapper.get('[data-testid="insert-text-cell-after-0"]').trigger('click')
    await wrapper.get('[data-testid="community-cell-text-1"]').setValue('Second')
    await wrapper.get('[data-testid="insert-text-cell-after-0"]').trigger('click')
    await wrapper.get('[data-testid="community-cell-text-1"]').setValue('Inserted')

    const textCells = wrapper.findAll('[data-testid^="community-cell-text-"]')
    expect(textCells.map((cell) => (cell.element as HTMLTextAreaElement).value)).toEqual(['First', 'Inserted', 'Second'])
  })

  it('allows creating more than five cells', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    for (let index = 0; index < 6; index += 1) {
      await wrapper.get(`[data-testid="insert-text-cell-after-${index}"]`).trigger('click')
    }

    expect(wrapper.findAll('[data-testid^="community-cell-text-"]')).toHaveLength(7)
  })

  it('accepts images larger than two megabytes and up to five megabytes', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="community-title-input"]').setValue('Large image')
    await wrapper.get('[data-testid="insert-image-cell-after-0"]').trigger('click')
    const file = new File([new Uint8Array(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const imageInput = wrapper.get('[data-testid="community-cell-image-1"]').element as HTMLInputElement
    Object.defineProperty(imageInput, 'files', { value: [file] })
    await wrapper.get('[data-testid="community-cell-image-1"]').trigger('change')
    await wrapper.get('[data-testid="submit-community-post"]').trigger('click')
    await flushPromises()

    expect(uploadCommunityImage).toHaveBeenCalledWith('token', file)
  })

  it('rejects images larger than five megabytes before upload', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="insert-image-cell-after-0"]').trigger('click')
    const file = new File([new Uint8Array((5 * 1024 * 1024) + 1)], 'too-large.jpg', { type: 'image/jpeg' })
    const imageInput = wrapper.get('[data-testid="community-cell-image-1"]').element as HTMLInputElement
    Object.defineProperty(imageInput, 'files', { value: [file] })
    await wrapper.get('[data-testid="community-cell-image-1"]').trigger('change')

    expect(wrapper.text()).toContain('이미지는 5MB 이하만 업로드할 수 있습니다.')
    expect(uploadCommunityImage).not.toHaveBeenCalled()
  })

  it('previews the selected original image without a gray backing layer', async () => {
    const wrapper = mount(CommunityEditorPage, {
      props: { accessToken: 'token' },
      global: { stubs: { Transition: false } },
    })

    await wrapper.get('[data-testid="insert-image-cell-after-0"]').trigger('click')
    const file = new File(['image'], 'original.jpg', { type: 'image/jpeg' })
    const imageInput = wrapper.get('[data-testid="community-cell-image-1"]').element as HTMLInputElement
    Object.defineProperty(imageInput, 'files', { value: [file] })
    await wrapper.get('[data-testid="community-cell-image-1"]').trigger('change')

    const preview = wrapper.get('img[alt="셀 이미지 미리보기"]')
    const previewWrapper = preview.element.parentElement

    expect(previewWrapper?.classList.contains('bg-slate-100')).toBe(false)
    expect(preview.classes()).toEqual(expect.arrayContaining(['block', 'h-auto', 'max-w-full']))
    expect(preview.classes()).not.toContain('object-contain')
    expect(preview.classes()).not.toContain('object-cover')
  })
})
