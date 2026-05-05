"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
// import { useEffect } from "react";
// import { redirect } from "next/navigation";
import { Heart, BookOpen } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  // const { isAuthenticated, isLoading } = useConvexAuth(); // TODO: re-enable after auth config
  const user = useQuery(api.auth.getCurrentUser);
  const wishlist = useQuery(
    api.wishlist.getByUser,
    user?._id ? { userId: user._id as any } : "skip"
  );
  const removeFromWishlist = useMutation(api.wishlist.remove);

  // useEffect(() => { // TODO: re-enable after auth config
  //   if (!isLoading && !isAuthenticated) redirect("/sign-in");
  // }, [isAuthenticated, isLoading]);

  // if (isLoading) {
  //   return <div className="flex justify-center py-12"><div className="animate-pulse">Loading...</div></div>;
  // }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wishlist</h1>

      {!wishlist || wishlist.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Heart className="mx-auto h-12 w-12 mb-4" />
          <p>Belum ada buku di wishlist</p>
          <Link href="/catalog" className="text-primary hover:underline text-sm mt-2 inline-block">
            Jelajahi katalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((item: any) => (
            <div key={item._id} className="rounded-lg border p-4 space-y-3">
              <div className="aspect-[3/4] bg-muted rounded flex items-center justify-center">
                {item.book?.coverImage ? (
                  <img src={item.book.coverImage} alt="" className="h-full w-full object-cover rounded" />
                ) : (
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{item.book?.title}</h3>
                <p className="text-sm text-muted-foreground">{item.book?.author}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  item.book?.status === "available" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {item.book?.status || "unknown"}
                </span>
                <button
                  onClick={() => removeFromWishlist({ userId: user?._id as any, bookId: item.bookId })}
                  className="text-red-500 hover:text-red-700"
                >
                  <Heart className="h-5 w-5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
