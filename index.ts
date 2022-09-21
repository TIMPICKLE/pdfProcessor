import { degrees, PDFDocument, Rotation } from "pdf-lib";
import download from "downloadjs";

// start
export class PDFProcessor {
  // 常见的文件用JS转Base64之后的data类型
  static txt = 'data:text/plain;base64';
  static doc = 'data: application / msword; base64';
  static docx =
        'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64';
  static xls = 'datadata:application/vnd.ms-excel;base64';
  static xlsx = ' data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';
  static pdf = 'data:application/pdf;base64';
  static pptx =
        'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,';
  static ppt = 'data:application/vnd.ms-powerpoint;base64';
  
  
  //状态变量 电子签名canvas绘制图片配置 单位统一为px
  static ImageHight: number = 40;
  static ImageWidth: number = 80;
  static ImageOpacity: number = 0.55;
  static originPDFRotateDegrees: number;
  static ImageRotateDegrees: Rotation;
  static cycleInterval: number = 10;
  static ImageMarginToBorder: number = 20;

  // pdf旋转角度对应 Lower right corner Lower left corner upper right corner lower right
  static rotationAngleMap = new Map([
    ["noRotationAngle", 0],
    ["90RotationAngle", 90],
    ["180RotationAngle", 180],
    ["270RotationAngle", 270],
  ]);

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
  
  //直接打开pdf 不下载
  // 交互方式：直接通过浏览器tag打开 不再下载
  // 逻辑：Base64 -> utf8 DtatArray ->  Unicode 编码 -> Blob -> url打开Blob
  // 参数 eg. String Base64 , "application.pdf"
  static viewPDFWithoutDownl(fileContent: string,fileType: string) {
    const contentTemp = fileContent.split(',');
    const content = contentTemp[1];
    const bytes = window.atob(content);
    const dataArray = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        dataArray[i] = bytes.charCodeAt(i);
     }
    const blob = new Blob([dataArray], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    open(url);
    }

  //获取文件的base64 不执行任何回掉
  static getBase64WithoutCallback(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let fileResult;
      reader.readAsDataURL(file);
      reader.onload = () => {
        fileResult = reader.result;
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.onloadend = () => {
        resolve(fileResult);
      };
    });
  }

  // 添加电子签名函数
  // NIHAO TODO: 这边还需要继续抽离
  static UIHaddDigitalSignature(
    pdfFile: File,
    imageStringArray: Array<string>
  ): Promise<ArrayBufferLike> {
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

  // 通过枚举来设置指定的位置
  static getLocation(location: DigitalSignatureLocation, pdfFile: File) {
    const fileBytesAsPromise = pdfFile.arrayBuffer();
    // x y 计算
    let locationObject = {
      x: 0,
      y: 0,
    };
    const resultLocationObject = fileBytesAsPromise.then(async (data) => {
      const pdfDoc = await PDFDocument.load(data as unknown as ArrayBuffer);
      const pages = await pdfDoc.getPages();

      // 获取 宽高
      const pdfHight = pages[0].getHeight();
      const pdfWidth = pages[0].getWidth();

      switch (location) {
        case 0:
          console.log("LowerRight");
          locationObject.x = pdfWidth - this.ImageWidth * 1;
          locationObject.y = this.ImageMarginToBorder;
          break;
        case 1:
          console.log("LowerLeft");
          locationObject.x = this.cycleInterval;
          locationObject.y = this.ImageMarginToBorder;
          break;
        case 2:
          console.log("upperRight");
          locationObject.x = pdfWidth - this.ImageWidth * 1;
          locationObject.y = pdfHight - this.ImageHight * 1;
          break;
        case 3:
          console.log("upperLeft");
          locationObject.x = pdfHight - this.ImageHight * 1;
          locationObject.y = this.ImageMarginToBorder;
          break;
      }

      return locationObject;
    });
    return resultLocationObject;
  }

  // 添加单个电子签名  （一种添加电子签名的通用的方法）
  static addSingleDigitalSignature(
    pdfFile: File,
    imageString: string,
    location: DigitalSignatureLocation
  ): Promise<ArrayBufferLike> {
    const fileBytesAsPromise = pdfFile.arrayBuffer();

    const resultPDFArray = fileBytesAsPromise.then(
      async (data): Promise<ArrayBufferLike> => {
        const pdfDoc = await PDFDocument.load(data as unknown as ArrayBuffer);
        const pages = await pdfDoc.getPages();

        //获取电子签名图片资源类型
        const ImgSrcType = this.getImageType(imageString);
        // 图片资源开辟内存
        let DigitalSignalImg;

        // 获取旋转角度
        const PDFRotationAngle = pages[0].getRotation().angle;
        // 同步图片和文档的旋转角度
        this.ImageRotateDegrees = degrees(this.originPDFRotateDegrees);

        // 获取 宽高 用于计算横板pdf的canvas绘制
        const pdfHight = pages[0].getHeight();
        const pdfWidth = pages[0].getWidth();

        // 获取位置对象
        const resultLocation = this.getLocation(location, pdfFile);

        if (ImgSrcType === "JPG") {
          DigitalSignalImg = await pdfDoc.embedJpg(imageString);
        } else if (ImgSrcType === "PNG") {
          DigitalSignalImg = await pdfDoc.embedPng(imageString);
        } else {
          console.log("图片格式既不是jpg也不是png");
        }

        if (PDFRotationAngle === this.rotationAngleMap.get("noRotationAngle")) {
          for (let page = 0; page < pages.length; page++) {
            pages[page].drawImage(DigitalSignalImg, {
              x: (await resultLocation).x,
              y: (await resultLocation).y,
              width: this.ImageWidth,
              height: this.ImageHight,
              opacity: this.ImageOpacity,
            });
          }
        } else {
          console.log("不是A4格式");
        }

        const pdfBytes = await pdfDoc.save();
        //download(pdfBytes, `utiltest`, 'application/pdf');
        const arrayBuffer = pdfBytes.buffer;
        return arrayBuffer;
      }
    );
    return resultPDFArray;
  }
}
