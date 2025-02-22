const productModel = require("../models/productModel")
const userModel = require("../models/userModel")
const { uploadFile } = require("../middlewares/aws")
const { isValidTitle, isValidDesc, isValidPrice } = require("../validations/validation")
const mongoose = require("mongoose")

//============================================(CREATE PRODUCT)=========================================//

const createProduct = async function (req, res) {
    try {
        let data = req.body
        let files = req.files

        if (Object.keys(data).length == 0) return res.status(400).send({ status: false, message: "Please provide some data in body" })

        var { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data

        if (!title) return res.status(400).send({ status: false, message: "Title is mandatory" })
        title = title.trim()
        if (!isValidTitle(title)) return res.status(400).send({ status: false, message: "Title should not contain Numeric and special characters" })
        data.title = title

        if (!description) return res.status(400).send({ status: false, message: "Description is mandatory" })
        description = description.trim()
        if (!isValidDesc(description)) return res.status(400).send({ status: false, message: "Description should not contain Numeric and special characters" })
        data.description = description

        if (!price) return res.status(400).send({ status: false, message: "Price is mandatory" })
        if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "Invalid Price" })
        data.price = Number(price).toFixed(2)

        if (!currencyId) return res.status(400).send({ status: false, message: "CurrencyId is mandatory" })
        currencyId = currencyId.trim()
        if (currencyId != 'INR') return res.status(400).send({ status: false, message: "CurrencyId must be INR" })
        data.currencyId = currencyId

        if (!currencyFormat) return res.status(400).send({ status: false, message: "CurrencyFormat is mandatory" })
        currencyFormat = currencyFormat.trim()
        if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "Currency Format must be ₹" })
        data.currencyFormat = currencyFormat


        if (!availableSizes) return res.status(400).send({ status: false, message: "AvailableSizes is mandatory" })
        availableSizes = availableSizes.split(",")
        for (let i = 0; i < availableSizes.length; i++) {
            availableSizes[i] = availableSizes[i].trim()
            if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes[i])) return res.status(400).send({ status: false, message: "only accepts S,XS,M,X,L,XXL,XL  seperated by commas." })
        }
        data.availableSizes = availableSizes


        if (isFreeShipping) {
            if (isFreeShipping !== "true" && isFreeShipping !== "false") return res.status(400).send({ status: false, message: "IsfreeShipping must be True and False" })
        }

        data.isFreeShipping = isFreeShipping
        if (installments == '' || style == '') return res.status(400).send({ status: false, message: "Enter some data in Installments and Style" })
        data.style = style
        data.installments = installments

        let uniqueTitle = await productModel.findOne({ title: title })
        if (uniqueTitle) return res.status(400).send({ status: false, message: "Title already present" })


        if (files && files.length > 0) {
            if (files.length > 1) return res.status(400).send({ status: false, message: "You can't enter more than one file to Create" })
            let uploadedFileURL = await uploadFile(files[0])
            data.productImage = uploadedFileURL 

        }
        else {
            return res.status(400).send({ message: "Please enter product image in body" })
        }

        let create = await productModel.create(data)
        
        let {_id,title,description,price,currencyId,currencyFormat,isFreeShipping,productImage,style,availableSizes,installments,deletedAt,isDeleted,createdAt,updatedAt} = create 
        return res.status(201).send({ status: true, message: "Success", data: {_id,title,description,price,currencyId,currencyFormat,isFreeShipping,productImage,style,availableSizes,installments,deletedAt,isDeleted,createdAt,updatedAt} })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

//============================================(GET PRODUCTS BY QUERY)=====================================//

const getProductsByQuery = async function (req, res) {
    try {
        let query = req.query
        if (Object.keys(query).length == 0) {
            let allData = await productModel.find({ isDeleted: false })
            return res.status(200).send({ status: true, message: "Success", data: allData })
        }
        else {
            let { size, name, priceGreaterThan, priceLessThan, priceSort } = query

            let obj = {}

            if (size) {

                size = size.toUpperCase()
                if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size)) return res.status(400).send({ status: false, message: "only accepts S,XS,M,X,L,XXL,XL" })
                obj.availableSizes = [size]
            }
            if (name) {


                obj.title = { $regex: name.trim() }

            }
            var numberRegex = /^[0-9.]*$/
            if (priceGreaterThan && priceLessThan) {
                priceGreaterThan = priceGreaterThan.trim()
                if (!numberRegex.test(priceGreaterThan)) return res.send({ message: "accepts only numbers." })
                priceLessThan = priceLessThan.trim()
                if (!numberRegex.test(priceGreaterThan)) return res.send({ message: "accepts only numbers" })
                Number(priceGreaterThan)
                Number(priceLessThan)
                obj.price = { $gt: priceGreaterThan, $lt: priceLessThan }

            }

            if (priceGreaterThan && !priceLessThan) {
                priceGreaterThan = priceGreaterThan.trim()

                if (!numberRegex.test(priceGreaterThan)) return res.send({ message: "accepts only numbers in priceLessThan" })
                Number(priceGreaterThan)
                obj.price = { $gt: priceGreaterThan }

            }

            if (priceLessThan && !priceGreaterThan) {
                priceLessThan = priceLessThan.trim()
                if (!numberRegex.test(priceLessThan)) return res.send({ message: "accepts only numbers in priceGreaterThan" })
                Number(priceLessThan)
                obj.price = { $lt: priceLessThan }

            }

            obj.isDeleted = false

            if (priceSort) {

                if (priceSort != "1" && priceSort != "-1") return res.status(404).send({ status: false, message: "Can only be 1 or -1 for sorting." })
                Number(priceSort)
                var findData = await productModel.find(obj).sort({ price: priceSort })
            }
            else {
                var findData = await productModel.find(obj)
            }

            if (findData.length == 0) return res.status(404).send({ status: false, message: "Product not found" })
            return res.status(200).send({ status: true, message: "Success", data: findData })

        }
    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//==========================================(GET PRODUCTS BY PATH)==================================================//

const getProductsByParams = async function (req, res) {

    try {
        let productId = req.params.productId
        if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "productId is invalid" })
        let getproduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!getproduct) return res.status(404).send({ status: false, message: "Product not found or might be deleted " })
        return res.status(200).send({ status: true, message: "Success", data: getproduct })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//==========================================(UPDATE PRODUCTS)=====================================================//

const updateProductsByParams = async function (req, res) {
    try {
        let body = req.body
        let productId = req.params.productId
        let obj = {}
        let { title, description, price, isFreeShipping, productImage, installments, style, availableSizes, isDeleted } = body

        if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "productId is invalid" })

        let checkproduct = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!checkproduct) return res.status(404).send({ status: false, message: "product not found or either deleted" })

        if (title) {
            let unique = await productModel.findOne({ title: title })
            if (unique) return res.status(400).send({ status: false, message: "title is already exists needs to be unique" })
            if (!isValidTitle(title)) return res.status(400).send({ status: false, message: "invalid title" })
            obj.title = title
        }

        if (description) {
            obj.description = description
        }
        if (price) {
            if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "invalid price" })

            obj.price = Number(price).toFixed(2)
        }
        if (isFreeShipping) {
            if (isFreeShipping) {
                if (isFreeShipping !== "true") return res.status(400).send({ status: false, message: "IsfreeShipping must be True and False" })
            }
            obj.isFreeShipping = isFreeShipping
        }
        if (installments) {
            obj.installments = installments
        }
        if (style) {
            obj.style = style
        }
        if (availableSizes) {
            //provide available sizes like this => S,XS,M,X,XL,XXL,XL
            obj.availableSizes = checkproduct.availableSizes
            if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes)) return res.status(400).send({ status: false, message: "only accepts S,XS,M,X,L,XXL,XL" })
            if (obj.availableSizes.includes(availableSizes)) return res.status(400).send({ status: false, message: "Size already exists" })
            obj.availableSizes.push(availableSizes)
        }
        if(isDeleted === "true"){
            obj.isDeleted = isDeleted
            obj.deletedAt = Date.now()
        }
        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            productImage = uploadedFileURL
            obj.productImage = productImage

        }

        if (Object.keys(obj).length === 0) return res.status(400).send({ status: false, message: "please provide some data for updation" })
        let updateproduct = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, obj, { new: true })
        return res.status(200).send({ status: true, message: "Success", data: updateproduct })



    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }

}

//==========================================(DELETE PRODUCTS)==================================================//
const deleteProductsByParams = async function (req, res) {
    try {
        let productId = req.params.productId
        if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Please provide valid productId" })
        let deleteProduct = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { isDeleted: true }, { new: true })
        if (!deleteProduct) return res.status(400).send({ status: false, message: "Product already deleted" })
        return res.status(200).send({ status: true, message: "Success", data: "Document Deleted!" })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}


module.exports = { createProduct, getProductsByQuery, getProductsByParams, updateProductsByParams, deleteProductsByParams }