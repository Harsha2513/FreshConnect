const { sql, poolPromise } = require("../config/db");

async function supplierForUser(userId) {
 const pool = await poolPromise;
 const r = await pool.request().input("UserId", sql.Int, userId).query("SELECT SupplierId FROM Suppliers WHERE UserId=@UserId");
 return r.recordset[0]?.SupplierId;
}
async function restaurantForUser(userId) {
 const pool = await poolPromise;
 const r = await pool.request().input("UserId", sql.Int, userId).query("SELECT RestaurantId, Address FROM Restaurants WHERE UserId=@UserId");
 return r.recordset[0];
}
exports.listProducts = async (req,res) => {
 try {
  const pool=await poolPromise;
  const r=await pool.request().query(`SELECT p.ProductId AS id,p.ProductName AS name,p.Category AS category,p.Description AS description,p.Price AS price,p.Stock AS stock,p.Unit AS unit,s.BusinessName AS supplier,s.District AS district FROM Products p JOIN Suppliers s ON s.SupplierId=p.SupplierId WHERE p.IsActive=1 AND p.Stock>0 ORDER BY p.CreatedAt DESC`);
  res.json(r.recordset);
 } catch(e){ console.error(e); res.status(500).json({message:"Could not load products."}); }
};
exports.myProducts = async(req,res)=>{
 try { const sid=await supplierForUser(req.user.userId); if(!sid)return res.status(403).json({message:"Supplier profile not found."});
 const pool=await poolPromise; const r=await pool.request().input("SupplierId",sql.Int,sid).query("SELECT ProductId AS id,ProductName AS name,Category AS category,Description AS description,Price AS price,Stock AS stock,Unit AS unit,IsActive AS isActive FROM Products WHERE SupplierId=@SupplierId ORDER BY CreatedAt DESC"); res.json(r.recordset);
 }catch(e){console.error(e);res.status(500).json({message:"Could not load your products."});}
};
exports.addProduct=async(req,res)=>{
 try { const {name,category,description,price,stock,unit}=req.body; if(!name?.trim()||!Number.isFinite(Number(price))||Number(price)<=0||!Number.isFinite(Number(stock))||Number(stock)<0||!unit)return res.status(400).json({message:"Enter valid product name, price, stock and unit."});
 const sid=await supplierForUser(req.user.userId); if(!sid)return res.status(403).json({message:"Supplier profile not found."}); const pool=await poolPromise;
 const r=await pool.request().input("SupplierId",sql.Int,sid).input("Name",sql.NVarChar(120),name.trim()).input("Category",sql.NVarChar(60),category||null).input("Description",sql.NVarChar(500),description||null).input("Price",sql.Decimal(10,2),Number(price)).input("Stock",sql.Decimal(12,2),Number(stock)).input("Unit",sql.NVarChar(20),unit).query(`INSERT INTO Products(SupplierId,ProductName,Category,Description,Price,Stock,Unit) OUTPUT INSERTED.ProductId AS id VALUES(@SupplierId,@Name,@Category,@Description,@Price,@Stock,@Unit)`);
 res.status(201).json({success:true,id:r.recordset[0].id,message:"Product added."});
 }catch(e){console.error(e);res.status(500).json({message:"Could not add product."});}
};
exports.updateProduct=async(req,res)=>{
 try {
  const id=Number(req.params.id);
  const {name,category,description,price,stock,unit,isActive}=req.body;
  if(!Number.isInteger(id)||id<=0||!name?.trim()||!Number.isFinite(Number(price))||Number(price)<=0||!Number.isFinite(Number(stock))||Number(stock)<0||!unit)
   return res.status(400).json({message:"Enter valid product name, price, stock and unit."});
  const sid=await supplierForUser(req.user.userId);
  if(!sid)return res.status(403).json({message:"Supplier profile not found."});
  const pool=await poolPromise;
  const r=await pool.request()
   .input("Id",sql.Int,id).input("SupplierId",sql.Int,sid)
   .input("Name",sql.NVarChar(120),name.trim())
   .input("Category",sql.NVarChar(60),category||null)
   .input("Description",sql.NVarChar(500),description||null)
   .input("Price",sql.Decimal(10,2),Number(price))
   .input("Stock",sql.Decimal(12,2),Number(stock))
   .input("Unit",sql.NVarChar(20),unit)
   .input("Active",sql.Bit,isActive===false?0:1)
   .query(`UPDATE Products SET ProductName=@Name,Category=@Category,Description=@Description,Price=@Price,Stock=@Stock,Unit=@Unit,IsActive=@Active,UpdatedAt=SYSUTCDATETIME() WHERE ProductId=@Id AND SupplierId=@SupplierId; SELECT @@ROWCOUNT AS changed`);
  if(!r.recordset[0].changed)return res.status(404).json({message:"Product not found."});
  res.json({success:true,message:"Product updated."});
 } catch(e){console.error("Update product:",e);res.status(500).json({message:"Could not update product."});}
};
exports.deleteProduct=async(req,res)=>{
 try {const sid=await supplierForUser(req.user.userId);const pool=await poolPromise;const r=await pool.request().input("Id",sql.Int,Number(req.params.id)).input("SupplierId",sql.Int,sid).query("UPDATE Products SET IsActive=0,UpdatedAt=SYSUTCDATETIME() WHERE ProductId=@Id AND SupplierId=@SupplierId; SELECT @@ROWCOUNT AS changed");if(!r.recordset[0].changed)return res.status(404).json({message:"Product not found."});res.json({success:true,message:"Product removed from listing."});}
 catch(e){console.error(e);res.status(500).json({message:"Could not delete product."});}
};
exports.updateStock=async(req,res)=>{
 try{const stock=Number(req.body.stock);if(!Number.isFinite(stock)||stock<0)return res.status(400).json({message:"Stock must be zero or more."});const sid=await supplierForUser(req.user.userId);const pool=await poolPromise;const tx=new sql.Transaction(pool);await tx.begin();try{const r=await new sql.Request(tx).input("Id",sql.Int,Number(req.params.id)).input("SupplierId",sql.Int,sid).input("Stock",sql.Decimal(12,2),stock).query("UPDATE Products SET Stock=@Stock,UpdatedAt=SYSUTCDATETIME() WHERE ProductId=@Id AND SupplierId=@SupplierId; SELECT @@ROWCOUNT AS changed");if(!r.recordset[0].changed)throw new Error("Product not found.");await new sql.Request(tx).input("Id",sql.Int,Number(req.params.id)).input("Change",sql.Decimal(12,2),stock).query("INSERT INTO StockTransactions(ProductId,ChangeAmount,Reason) VALUES(@Id,@Change,'Manual stock update')");await tx.commit();res.json({success:true,message:"Stock updated."});}catch(e){await tx.rollback();throw e;}}
 catch(e){res.status(e.message==="Product not found."?404:500).json({message:e.message||"Could not update stock."});}
};
exports.placeOrder=async(req,res)=>{
 const items=req.body.items; if(!Array.isArray(items)||!items.length)return res.status(400).json({message:"Cart is empty."});
 const restaurant=await restaurantForUser(req.user.userId);if(!restaurant)return res.status(403).json({message:"Restaurant profile not found."});
 const pool=await poolPromise;const tx=new sql.Transaction(pool);
 try{await tx.begin();let total=0;const clean=[];
  for(const item of items){const id=Number(item.productId),qty=Number(item.quantity);if(!Number.isInteger(id)||!Number.isFinite(qty)||qty<=0)throw new Error("Invalid cart item.");const pr=await new sql.Request(tx).input("Id",sql.Int,id).query("SELECT ProductId,SupplierId,ProductName,Price,Stock,Unit FROM Products WITH (UPDLOCK,ROWLOCK) WHERE ProductId=@Id AND IsActive=1");const p=pr.recordset[0];if(!p||Number(p.Stock)<qty)throw new Error(`Insufficient stock for ${p?.ProductName||'a product'}.`);clean.push({...p,qty});total+=Number(p.Price)*qty;}
  const ord=await new sql.Request(tx).input("RestaurantId",sql.Int,restaurant.RestaurantId).input("Total",sql.Decimal(12,2),total).input("Address",sql.NVarChar(300),req.body.deliveryAddress||restaurant.Address).input("Notes",sql.NVarChar(500),req.body.notes||null).query("INSERT INTO Orders(RestaurantId,TotalAmount,DeliveryAddress,Notes) OUTPUT INSERTED.OrderId AS id VALUES(@RestaurantId,@Total,@Address,@Notes)");const orderId=ord.recordset[0].id;
  for(const p of clean){await new sql.Request(tx).input("OrderId",sql.Int,orderId).input("ProductId",sql.Int,p.ProductId).input("SupplierId",sql.Int,p.SupplierId).input("Name",sql.NVarChar(120),p.ProductName).input("Price",sql.Decimal(10,2),p.Price).input("Qty",sql.Decimal(12,2),p.qty).input("Unit",sql.NVarChar(20),p.Unit).query("INSERT INTO OrderItems(OrderId,ProductId,SupplierId,ProductName,UnitPrice,Quantity,Unit) VALUES(@OrderId,@ProductId,@SupplierId,@Name,@Price,@Qty,@Unit)");await new sql.Request(tx).input("Id",sql.Int,p.ProductId).input("Qty",sql.Decimal(12,2),p.qty).input("OrderId",sql.Int,orderId).query("UPDATE Products SET Stock=Stock-@Qty,UpdatedAt=SYSUTCDATETIME() WHERE ProductId=@Id; INSERT INTO StockTransactions(ProductId,ChangeAmount,Reason,OrderId) VALUES(@Id,-@Qty,'Order placed',@OrderId)");}
  await tx.commit();res.status(201).json({success:true,orderId,totalAmount:total,message:"Order placed successfully."});
 }catch(e){try{await tx.rollback()}catch{}res.status(400).json({message:e.message||"Could not place order."});}
};
exports.restaurantOrders=async(req,res)=>{
 try{const rest=await restaurantForUser(req.user.userId);if(!rest)return res.status(403).json({message:"Restaurant profile not found."});const pool=await poolPromise;const r=await pool.request().input("RestaurantId",sql.Int,rest.RestaurantId).query(`SELECT o.OrderId AS orderId,o.OrderStatus AS status,o.TotalAmount AS total,o.CreatedAt AS createdAt,o.DeliveryAddress AS deliveryAddress,oi.ProductName AS productName,oi.Quantity AS quantity,oi.Unit AS unit,oi.UnitPrice AS price,oi.ItemStatus AS itemStatus,s.BusinessName AS supplier FROM Orders o JOIN OrderItems oi ON oi.OrderId=o.OrderId JOIN Suppliers s ON s.SupplierId=oi.SupplierId WHERE o.RestaurantId=@RestaurantId ORDER BY o.CreatedAt DESC`);res.json(r.recordset);}
 catch(e){console.error(e);res.status(500).json({message:"Could not load orders."});}
};
exports.farmerOrders=async(req,res)=>{
 try{const sid=await supplierForUser(req.user.userId);if(!sid)return res.status(403).json({message:"Supplier profile not found."});const pool=await poolPromise;const r=await pool.request().input("SupplierId",sql.Int,sid).query(`SELECT oi.OrderItemId AS orderItemId,o.OrderId AS orderId,r.RestaurantName AS restaurant,oi.ProductName AS productName,oi.Quantity AS quantity,oi.Unit AS unit,oi.LineTotal AS amount,oi.ItemStatus AS status,o.CreatedAt AS createdAt FROM OrderItems oi JOIN Orders o ON o.OrderId=oi.OrderId JOIN Restaurants r ON r.RestaurantId=o.RestaurantId WHERE oi.SupplierId=@SupplierId ORDER BY o.CreatedAt DESC`);res.json(r.recordset);}
 catch(e){console.error(e);res.status(500).json({message:"Could not load incoming orders."});}
};
exports.updateOrderItemStatus=async(req,res)=>{
 const allowed=["Accepted","Processing","OutForDelivery","Delivered","Cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({message:"Invalid order status."});
 try{
  const sid=await supplierForUser(req.user.userId);
  if(!sid)return res.status(403).json({message:"Supplier profile not found."});
  const pool=await poolPromise; const tx=new sql.Transaction(pool); await tx.begin();
  try{
   const current=await new sql.Request(tx)
    .input("ItemId",sql.Int,Number(req.params.itemId)).input("SupplierId",sql.Int,sid)
    .query("SELECT OrderId,ProductId,Quantity,ItemStatus FROM OrderItems WITH (UPDLOCK,ROWLOCK) WHERE OrderItemId=@ItemId AND SupplierId=@SupplierId");
   if(!current.recordset.length)throw new Error("Order item not found.");
   const item=current.recordset[0];
   await new sql.Request(tx).input("ItemId",sql.Int,Number(req.params.itemId)).input("Status",sql.VarChar(20),req.body.status)
    .query("UPDATE OrderItems SET ItemStatus=@Status WHERE OrderItemId=@ItemId");
   // Restore inventory exactly once if a supplier cancels an item.
   if(req.body.status==="Cancelled" && item.ItemStatus!=="Cancelled"){
    await new sql.Request(tx).input("ProductId",sql.Int,item.ProductId).input("Qty",sql.Decimal(12,2),item.Quantity).input("OrderId",sql.Int,item.OrderId)
     .query("UPDATE Products SET Stock=Stock+@Qty,UpdatedAt=SYSUTCDATETIME() WHERE ProductId=@ProductId; INSERT INTO StockTransactions(ProductId,ChangeAmount,Reason,OrderId) VALUES(@ProductId,@Qty,'Order item cancelled',@OrderId)");
   }
   await new sql.Request(tx).input("OrderId",sql.Int,item.OrderId).query(`
    UPDATE Orders SET OrderStatus=CASE
     WHEN NOT EXISTS(SELECT 1 FROM OrderItems WHERE OrderId=@OrderId AND ItemStatus<>'Cancelled') THEN 'Cancelled'
     WHEN NOT EXISTS(SELECT 1 FROM OrderItems WHERE OrderId=@OrderId AND ItemStatus NOT IN ('Delivered','Cancelled')) THEN 'Delivered'
     WHEN EXISTS(SELECT 1 FROM OrderItems WHERE OrderId=@OrderId AND ItemStatus IN ('Processing','OutForDelivery','Accepted','Delivered')) THEN 'Processing'
     ELSE 'Pending' END, UpdatedAt=SYSUTCDATETIME() WHERE OrderId=@OrderId`);
   await tx.commit(); res.json({success:true,message:"Order status updated."});
  }catch(e){await tx.rollback();throw e;}
 }catch(e){console.error("Update order status:",e);res.status(e.message==="Order item not found."?404:500).json({message:e.message||"Could not update order status."});}
};
exports.sales=async(req,res)=>{
 try{const sid=await supplierForUser(req.user.userId);const pool=await poolPromise;const r=await pool.request().input("SupplierId",sql.Int,sid).query(`SELECT COUNT(DISTINCT CASE WHEN oi.ItemStatus='Delivered' THEN oi.OrderId END) AS deliveredOrders,COUNT(oi.OrderItemId) AS totalItems,COALESCE(SUM(CASE WHEN oi.ItemStatus='Delivered' THEN oi.LineTotal ELSE 0 END),0) AS deliveredSales FROM OrderItems oi WHERE oi.SupplierId=@SupplierId`);res.json(r.recordset[0]);}
 catch(e){console.error(e);res.status(500).json({message:"Could not load sales."});}
};
exports.profile=async(req,res)=>{
 try{const pool=await poolPromise;const r=await pool.request().input("UserId",sql.Int,req.user.userId).query(`SELECT u.UserId AS userId,u.FullName AS name,u.PhoneNumber AS phone,u.Email AS email,u.UserType AS role,COALESCE(s.BusinessName,r.RestaurantName) AS businessName,COALESCE(s.Address,r.Address) AS address,COALESCE(s.District,r.District) AS district,COALESCE(s.Pincode,r.Pincode) AS pincode,s.Village AS village FROM Users u LEFT JOIN Suppliers s ON s.UserId=u.UserId LEFT JOIN Restaurants r ON r.UserId=u.UserId WHERE u.UserId=@UserId`);if(!r.recordset.length)return res.status(404).json({message:"Profile not found."});res.json(r.recordset[0]);}
 catch(e){console.error(e);res.status(500).json({message:"Could not load profile."});}
};
exports.updateProfile=async(req,res)=>{
 try{const {name,email,businessName,address,district,pincode,village}=req.body;if(!name?.trim()||!address?.trim())return res.status(400).json({message:"Name and address are required."});const pool=await poolPromise;const tx=new sql.Transaction(pool);await tx.begin();try{await new sql.Request(tx).input("UserId",sql.Int,req.user.userId).input("Name",sql.NVarChar(100),name.trim()).input("Email",sql.NVarChar(150),email||null).query("UPDATE Users SET FullName=@Name,Email=@Email WHERE UserId=@UserId");await new sql.Request(tx).input("UserId",sql.Int,req.user.userId).input("Business",sql.NVarChar(150),businessName||null).input("Address",sql.NVarChar(300),address.trim()).input("District",sql.NVarChar(100),district||null).input("Pincode",sql.VarChar(6),pincode||null).input("Village",sql.NVarChar(100),village||null).query("UPDATE Suppliers SET BusinessName=@Business,Address=@Address,District=@District,Pincode=@Pincode,Village=@Village WHERE UserId=@UserId; UPDATE Restaurants SET RestaurantName=COALESCE(@Business,RestaurantName),Address=@Address,District=@District,Pincode=@Pincode WHERE UserId=@UserId");await tx.commit();res.json({success:true,message:"Profile updated."});}catch(e){await tx.rollback();throw e;}}
 catch(e){console.error(e);res.status(500).json({message:"Could not update profile."});}
};
