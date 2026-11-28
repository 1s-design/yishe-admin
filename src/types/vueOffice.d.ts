declare module "@vue-office/excel/lib/v3/vue-office-excel.mjs" {
  import type { DefineComponent } from "vue";

  const VueOfficeExcel: DefineComponent<
    {
      src: string | ArrayBuffer | Blob;
      options?: Record<string, any>;
    },
    any,
    any
  >;

  export default VueOfficeExcel;
}

declare module "@vue-office/excel/lib/v3/index.css";
