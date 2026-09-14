import request from "@/config/axios";

export interface DesignInspiration {
  id?: string;
  userId?: string;
  title: string;
  content: string;
  category?: string | null;
  keywords?: string[];
  images?: string[];
  promptHints?: string | null;
  avoidNotes?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface DesignInspirationPageParams {
  currentPage?: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}

export const createDesignInspiration = (data: DesignInspiration) =>
  request.post({ url: "/design-inspiration/create", data });

export const updateDesignInspiration = (data: DesignInspiration) =>
  request.post({ url: "/design-inspiration/update", data });

export const deleteDesignInspiration = (ids: string | string[]) =>
  request.post({
    url: "/design-inspiration/delete",
    data: { ids: Array.isArray(ids) ? ids : [ids] },
  });

export const getDesignInspirationPage = (data: DesignInspirationPageParams) =>
  request.post({ url: "/design-inspiration/page", data });

export const getDesignInspirationDetail = (id: string) =>
  request.get({ url: `/design-inspiration/${id}` });
