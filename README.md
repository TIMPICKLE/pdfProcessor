# pdfProcessor

### Its a pdf tool to help you add digital signature. And its version is 1.0.1 So you cant enter any variable, All the variables are hidden eg.  
```
    static ImageHight: number = 40;
    static ImageWidth: number = 80;
    static ImageOpacity: number = 0.55;
    static originPDFRotateDegrees:number ;
    static ImageRotateDegrees: Rotation;
    static cycleInterval: number = 10;
    static ImageMarginToBorder: number = 20;
```
but in future, i will rebuild it. split those const variables, and then, you can use your personal configuration. 
In a word, this a bad version, i will maintain this project continuously.

now, its version 1.0.2. so i add another tool function to open pdf directly without downloading. so quick :)

🔽
1. static getImageType( base64String:string ) : string{}
2. static bufToFile(buf, filename) {}
3. static getBase64FromFile(f: File, callback: (f: string) => void): void {})
4. static addDigitalSignature(pdfFile: File, imageStringArray: Array<string>) {}
5. static getLocation(location: DigitalSignatureLocation, pdfFile: File) {}
6. static addSingleDigitalSignature(
    pdfFile: File,
    imageString: string,
    location: DigitalSignatureLocation
  ): Promise<ArrayBufferLike> {}
  
7. static viewPDFWithoutDownl(fileContent: string,fileType: string) {}

