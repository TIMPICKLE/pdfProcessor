import { degrees, PDFDocument, Rotation } from "pdf-lib";
import download from "downloadjs";

// start
export class PDFProcessor {
  //状态变量 电子签名canvas绘制图片配置 单位统一为px
  static ImageHight: number = 40;
  static ImageWidth: number = 80;
  static ImageOpacity: number = 0.55;
  static originPDFRotateDegrees: number;
  static ImageRotateDegrees: Rotation;
  static cycleInterval: number = 10;
  static ImageMarginToBorder: number = 20;

  // pdf旋转角度对应
  static rotationAngleMap = new Map([
    ["noRotationAngle", 0],
    ["90RotationAngle", 90],
    ["180RotationAngle", 180],
    ["270RotationAngle", 270],
  ]);
  static thirdPartReportsService: any;

  // 获取电子签名（图片）类型
  static getImageType(base64String: string): string {
    const fileHeader = new Map<string, string>();
    //获取不同文件的文件头前3个字作为判断依据
    fileHeader.set("/9j", "JPG");
    fileHeader.set("iVB", "PNG");
    fileHeader.set("Qk0", "BMP");
    fileHeader.set("SUk", "TIFF");
    fileHeader.set("JVB", "PDF");
    fileHeader.set("UEs", "OFD");

    let res = "";

    //遍历map中所提及的文件头特征
    fileHeader.forEach((v, k) => {
      if (k == base64String.slice(0, 3)) {
        res = v;
      }
    });

    return res;
  }

  // ArrayBuffer转换为File文件
  static bufToFile(buf, filename) {
    return new File([buf], filename, {
      type: "application/pdf",
    });
  }

  //文件转base64字符串 并且执行回调o
  static getBase64FromFile(f: File, callback: (f: string) => void): void {
    const reader = new FileReader();
    reader.addEventListener("load", () => callback(reader.result.toString()));
    reader.readAsDataURL(f);
  }

  static addDigitalSignature(pdfFile: File, imageStringArray: Array<string>) {
    const fileBytesAsPromise = pdfFile.arrayBuffer();

    const resultPDFArray = fileBytesAsPromise.then(
      async (data): Promise<ArrayBufferLike> => {
        const pdfDoc = await PDFDocument.load(data as unknown as ArrayBuffer);
        const pages = await pdfDoc.getPages();

        //获取电子签名图片资源类型
        const ImgSrcType = this.getImageType(imageStringArray[0]);
        // 图片资源开辟内存
        let designUserImg;
        let confirmedUserImg;
        let reviewUserImg;

        // 获取旋转角度
        const PDFRotationAngle = pages[0].getRotation().angle;
        // 同步图片和文档的旋转角度
        this.ImageRotateDegrees = degrees(this.originPDFRotateDegrees);

        // 获取 宽高 用于计算横板pdf的canvas绘制
        const pdfHight = pages[0].getHeight();
        const pdfWidth = pages[0].getWidth();

        if (ImgSrcType === "JPG") {
          designUserImg = await pdfDoc.embedJpg(imageStringArray[0]);
          reviewUserImg = await pdfDoc.embedJpg(imageStringArray[1]);
          confirmedUserImg = await pdfDoc.embedJpg(imageStringArray[2]);
        } else if (ImgSrcType === "PNG") {
          designUserImg = await pdfDoc.embedPng(imageStringArray[0]);
          reviewUserImg = await pdfDoc.embedPng(imageStringArray[1]);
          confirmedUserImg = await pdfDoc.embedPng(imageStringArray[2]);
        } else {
          console.log("图片格式既不是jpg也不是png");
        }

        if (PDFRotationAngle === this.rotationAngleMap.get("noRotationAngle")) {
          for (let page = 0; page < pages.length; page++) {
            pages[page].drawImage(designUserImg, {
              x: this.cycleInterval + this.ImageWidth * 0,
              y: this.ImageMarginToBorder,
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
            });
            pages[page].drawImage(reviewUserImg, {
              x: this.cycleInterval + this.ImageWidth * 1,
              y: this.ImageMarginToBorder,
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
            });
            pages[page].drawImage(confirmedUserImg, {
              x: this.cycleInterval + this.ImageWidth * 2,
              y: this.ImageMarginToBorder,
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
            });
          }
        }

        if (PDFRotationAngle === this.rotationAngleMap.get("90RotationAngle")) {
          for (let page = 0; page < pages.length; page++) {
            pages[page].drawImage(designUserImg, {
              x: pdfWidth,
              y: pdfHight - (this.cycleInterval + this.ImageWidth * 1),
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
              rotate: this.ImageRotateDegrees,
            });
            pages[page].drawImage(reviewUserImg, {
              x: pdfWidth,
              y: pdfHight - (this.cycleInterval + this.ImageWidth * 2),
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
              rotate: this.ImageRotateDegrees,
            });
            pages[page].drawImage(confirmedUserImg, {
              x: pdfWidth,
              y: pdfHight - (this.cycleInterval + this.ImageWidth * 3),
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
              rotate: this.ImageRotateDegrees,
            });
          }
        }

        const pdfBytes = await pdfDoc.save();
        //download(pdfBytes, `utiltest`, 'application/pdf');
        const arrayBuffer = pdfBytes.buffer;
        return arrayBuffer;
      }
    );
    return resultPDFArray;
  }

  static getBase64WithNoCallback(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let fileResult ;
      reader.readAsDataURL(file);
      //开始转
      reader.onload = () => {
        fileResult = reader.result;
      };
      //转失败
      reader.onerror = (error) => {
        reject(error);
      };
      //结束 resolve
      reader.onloadend = () => {
        resolve(fileResult);
      };
    });
  }
}
